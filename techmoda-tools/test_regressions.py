"""Offline regression tests; no AWS credentials or boto3 installation needed."""
import importlib.util
import io
import json
import os
from pathlib import Path
import sys
import unittest
from contextlib import redirect_stdout
from decimal import Decimal
from email.message import Message
from unittest.mock import Mock, patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(Path(__file__).resolve().parent))
from configure_frontend import OUTPUTS, runtime_config
from check_services import request


def load_handler(folder):
    path = next(ROOT.glob("sessions/*/functions/" + folder + "/app.py"))
    spec = importlib.util.spec_from_file_location(folder.replace("-", "_"), path)
    module = importlib.util.module_from_spec(spec)
    with patch.dict(sys.modules, {"boto3": Mock()}), patch.dict(os.environ, {"PRODUCTS_TABLE": "test", "AUDIO_BUCKET": "audio-test"}):
        spec.loader.exec_module(module)
    return module


def invoke(module, body=None, path="/products/p1/voice"):
    with redirect_stdout(io.StringIO()):
        return module.lambda_handler({"rawPath": path, "body": json.dumps(body or {})}, None)


class RegressionTests(unittest.TestCase):
    def test_live_checker_rejects_duplicate_cors_headers(self):
        class Response(io.BytesIO):
            status = 200
        for values, expected in ((["*"], True), (["*", "http://shop.example"], False), ([], False)):
            response = Response(b'{"ok":true}')
            response.headers = Message()
            for value in values:
                response.headers["Access-Control-Allow-Origin"] = value
            with patch("urllib.request.urlopen", return_value=response):
                _, valid, _ = request("https://voice.example", "POST", "http://shop.example")
            self.assertEqual(valid, expected)

    def test_only_function_urls_own_ai_cors(self):
        paths = list(ROOT.glob("sessions/*/functions/*/app.py"))
        self.assertEqual(len(paths), 9)
        for path in paths:
            module = load_handler(path.parent.name)
            for status in (200, 400, 500):
                self.assertFalse(any(key.lower().startswith("access-control-") for key in module._response(status, {})["headers"]))
        template = (ROOT / "template.yaml").read_text(encoding="utf-8")
        self.assertEqual(template.count("        Cors:"), 9)
        self.assertEqual(template.count("- !GetAtt FrontendBucket.WebsiteURL"), 9)

    def test_guardrail_never_persists_a_description(self):
        module = load_handler("generate-description")
        module.table.get_item.return_value = {"Item": {"name": "Vestido"}}
        for reason in ("guardrail_intervened", "content_filtered"):
            module.bedrock.converse.return_value = {"stopReason": reason}
            response = invoke(module, {"save": True})
            self.assertEqual(response["statusCode"], 422)
            self.assertTrue(json.loads(response["body"])["blocked"])
        module.table.update_item.assert_not_called()

    def test_description_preview_does_not_save(self):
        module = load_handler("generate-description")
        module.table.get_item.return_value = {"Item": {"name": "Vestido"}}
        module.bedrock.converse.return_value = {"output": {"message": {"content": [{"text": "Un vestido."}]}}, "stopReason": "end_turn"}
        response = invoke(module, {"save": False})
        self.assertEqual(response["statusCode"], 200)
        self.assertFalse(json.loads(response["body"])["saved"])
        module.table.update_item.assert_not_called()

    def test_empty_generated_description_is_not_saved(self):
        module = load_handler("generate-description")
        module.table.get_item.return_value = {"Item": {"name": "Vestido"}}
        module.bedrock.converse.return_value = {"output": {"message": {"content": [{"text": " "}]}}, "stopReason": "end_turn"}
        self.assertEqual(invoke(module, {"save": True})["statusCode"], 502)
        module.table.update_item.assert_not_called()

    def test_flagged_image_stores_decimal_but_returns_json_numbers(self):
        module = load_handler("moderate-image")
        module.table.get_item.return_value = {"Item": {"name": "Producto", "imageUrl": "s3://test/photo.jpg"}}
        module.rekognition.detect_moderation_labels.return_value = {"ModerationLabels": [{"Name": "Test label", "Confidence": 91.25}]}
        module.rekognition.detect_labels.return_value = {"Labels": []}
        response = invoke(module)
        self.assertEqual(response["statusCode"], 200)
        self.assertEqual(json.loads(response["body"])["moderationFlags"][0]["confidence"], 91.25)
        values = module.table.update_item.call_args.kwargs["ExpressionAttributeValues"]
        self.assertIsInstance(values[":f"][0]["confidence"], Decimal)

    def test_empty_product_does_not_call_polly(self):
        module = load_handler("synthesize-voice")
        module.table.get_item.return_value = {"Item": {"productId": "p1"}}
        self.assertEqual(invoke(module)["statusCode"], 422)
        module.polly.synthesize_speech.assert_not_called()

    def test_invalid_voice_language_is_rejected(self):
        module = load_handler("synthesize-voice")
        self.assertEqual(invoke(module, {"lang": "zz"})["statusCode"], 400)
        module.polly.synthesize_speech.assert_not_called()

    def test_voice_returns_playable_url_and_correct_mime(self):
        module = load_handler("synthesize-voice")
        module.table.get_item.return_value = {"Item": {"name": "Vestido", "description": "Floral"}}
        module.polly.synthesize_speech.return_value = {"AudioStream": io.BytesIO(b"fake-mp3")}
        module.s3.generate_presigned_url.return_value = "https://audio.example/test.mp3"
        response = invoke(module, {"lang": "es"})
        self.assertEqual(json.loads(response["body"])["audioUrl"], "https://audio.example/test.mp3")
        self.assertEqual(module.s3.put_object.call_args.kwargs["ContentType"], "audio/mpeg")
        self.assertEqual(module.polly.synthesize_speech.call_args.kwargs["VoiceId"], "Lupe")

    def test_blocked_chat_does_not_recommend_products(self):
        module = load_handler("shopping-assistant")
        module._retrieve = Mock(return_value=[{"productId": "p1", "name": "Vestido"}])
        module.bedrock.converse.return_value = {"stopReason": "guardrail_intervened", "output": {"message": {"content": [{"text": "No puedo responder."}]}}}
        response = invoke(module, {"message": "Test"}, "/assistant")
        data = json.loads(response["body"])
        self.assertTrue(data["blocked"])
        self.assertEqual(data["retrieved"], [])

    def test_bad_chat_history_is_rejected(self):
        module = load_handler("shopping-assistant")
        self.assertEqual(invoke(module, {"message": "Hola", "history": "wrong"})["statusCode"], 400)
        module.bedrock.converse.assert_not_called()

    def test_runtime_config_needs_all_current_outputs(self):
        outputs = {value: "https://test.lambda-url.us-east-1.on.aws/" for value in OUTPUTS.values()}
        outputs.update(FrontendBucketName="test", FrontendUrl="http://test.example")
        config = runtime_config(outputs)
        self.assertEqual(len(config), 10)
        self.assertFalse(config["VITE_VOICE_URL"].endswith("/"))
        del outputs["SynthesizeVoiceUrl"]
        with self.assertRaisesRegex(ValueError, "SynthesizeVoiceUrl"):
            runtime_config(outputs)


if __name__ == "__main__":
    unittest.main()
