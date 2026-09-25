# Entrega de Luis Alfonso Rivera Adame

## Arquitectura implementada

React/Vite en S3 → Lambda Function URLs → DynamoDB y servicios AWS.
Rekognition: etiquetas y moderación. Comprehend: sentimiento.
Translate: traducción. Polly: voz. Bedrock: descripciones, embeddings y chat.
No se utiliza API Gateway en esta implementación.

Los embeddings Titan se guardan en DynamoDB; las Lambdas calculan similitud
coseno. El chatbot recupera productos y los entrega como contexto a Claude.
La recuperación usa un scan sin paginación, adecuado al prototipo pequeño;
para crecer requiere revisar paginación, latencia e indexación vectorial.

## Interfaz y datos

Diseño minimalista responsive. El modo cliente agrega seis productos de
muestra del frontend: no se guardan en DynamoDB ni tienen acciones IA.
El modo administrador utiliza productos reales. El cambio de modo es una
facilidad de demostración, no una autenticación. El carrito no procesa pagos.

## Verificación local

```bash
cd frontend
npm ci
npm run typecheck
npm test -- --run --silent
npm run build
```

Las URLs runtime se generan según el entorno. No se incluyen credenciales.
Para las acciones IA, comprobar las diez variables VITE_* utilizadas por el
frontend y los permisos CORS para el origen del sitio publicado.

## Despliegue actual

Bucket frontend: `techmoda-mxmex35-luisxplayer-frontend`, us-east-1.
Backend de la demo: stack `techmoda-ai`, en la misma cuenta AWS.
El sitio S3 usa HTTP. Para HTTPS se necesita una capa de distribución adecuada.

No ejecutar el script heredado de despliegue sin adaptar el bucket objetivo:
publica en otro bucket. El dominio de Luis se agregó a las Function URLs;
ese origen debe incorporarse también a SAM antes de futuros despliegues para
conservar la configuración. Los backups de restauración permanecen locales.

## Autoría

Entrega y adaptaciones: Luis Alfonso Rivera Adame. Basado en el workshop
https://github.com/gabanox/techmoda-ai-capstone. Se conservan su historial,
documentación y avisos de licencia existentes.
