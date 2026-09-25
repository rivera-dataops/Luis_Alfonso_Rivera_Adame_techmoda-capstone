import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { api } from './lib/api';
import { mockProducts, mockProductInput } from './test/mockData';

vi.mock('./lib/api');

describe('App Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.listProducts).mockResolvedValue(mockProducts);
  });

  describe('Initial Rendering', () => {
    it('should render app header with title', async () => {
      render(<App />);

      expect(screen.getByText('TechModa')).toBeInTheDocument();
      expect(screen.getByText('Catálogo de Productos')).toBeInTheDocument();
    });

    it('should render mode toggle button', () => {
      render(<App />);

      expect(screen.getByRole('button', { name: /modo cliente/i })).toBeInTheDocument();
    });

    it('should render search input', () => {
      render(<App />);

      expect(screen.getByPlaceholderText(/buscar productos/i)).toBeInTheDocument();
    });

    it('should render category filter', () => {
      render(<App />);

      const categoryFilter = screen.getByRole('combobox');
      expect(categoryFilter).toBeInTheDocument();
    });

    it('should show loading state initially', () => {
      vi.mocked(api.listProducts).mockImplementation(() => new Promise(() => {}));

      render(<App />);

      expect(screen.getByRole('status', { hidden: true })).toBeInTheDocument();
    });

    it('should load and display products', async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Camisa Blanca Clásica')).toBeInTheDocument();
      });

      expect(screen.getByText('Jeans Azules')).toBeInTheDocument();
      expect(screen.getByText('Zapatos Deportivos')).toBeInTheDocument();
      expect(screen.getByText('Reloj Elegante')).toBeInTheDocument();
    });
  });

  describe('Mode Toggle', () => {
    it('should start in customer mode', () => {
      render(<App />);

      expect(screen.getByRole('button', { name: /modo cliente/i })).toBeInTheDocument();
    });

    it('should switch to admin mode when toggle is clicked', async () => {
      const user = userEvent.setup();
      render(<App />);

      const toggleButton = screen.getByRole('button', { name: /modo cliente/i });
      await user.click(toggleButton);

      expect(screen.getByRole('button', { name: /modo admin/i })).toBeInTheDocument();
    });

    it('should show "Agregar Nuevo Producto" button in admin mode', async () => {
      const user = userEvent.setup();
      render(<App />);

      await waitFor(() => {
        expect(screen.queryByText('Camisa Blanca Clásica')).toBeInTheDocument();
      });

      const toggleButton = screen.getByRole('button', { name: /modo cliente/i });
      await user.click(toggleButton);

      expect(screen.getByRole('button', { name: /agregar nuevo producto/i })).toBeInTheDocument();
    });

    it('should hide "Agregar Nuevo Producto" button in customer mode', async () => {
      userEvent.setup();
      render(<App />);

      await waitFor(() => {
        expect(screen.queryByText('Camisa Blanca Clásica')).toBeInTheDocument();
      });

      expect(screen.queryByRole('button', { name: /agregar nuevo producto/i })).not.toBeInTheDocument();
    });
  });

  describe('Search Functionality', () => {
    it('should filter products by name', async () => {
      const user = userEvent.setup();
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Camisa Blanca Clásica')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/buscar productos/i);
      await user.type(searchInput, 'Camisa');

      expect(screen.getByText('Camisa Blanca Clásica')).toBeInTheDocument();
      expect(screen.queryByText('Jeans Azules')).not.toBeInTheDocument();
    });

    it('should filter products by description', async () => {
      const user = userEvent.setup();
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Camisa Blanca Clásica')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/buscar productos/i);
      await user.type(searchInput, 'correr');

      expect(screen.getByText('Zapatos Deportivos')).toBeInTheDocument();
      expect(screen.queryByText('Camisa Blanca Clásica')).not.toBeInTheDocument();
    });

    it('should be case insensitive', async () => {
      const user = userEvent.setup();
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Camisa Blanca Clásica')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/buscar productos/i);
      await user.type(searchInput, 'CAMISA');

      expect(screen.getByText('Camisa Blanca Clásica')).toBeInTheDocument();
    });

    it('should show message when no products match', async () => {
      const user = userEvent.setup();
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Camisa Blanca Clásica')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/buscar productos/i);
      await user.type(searchInput, 'productoquenoexiste');

      expect(screen.getByText(/no se encontraron productos/i)).toBeInTheDocument();
      expect(screen.getByText(/intenta ajustar los filtros/i)).toBeInTheDocument();
    });
  });

  describe('Category Filter', () => {
    it('should show all categories by default', async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Camisa Blanca Clásica')).toBeInTheDocument();
      });

      const categoryFilter = screen.getByRole('combobox');
      expect(categoryFilter).toHaveValue('Todos');
    });

    it('should filter by Ropa category', async () => {
      const user = userEvent.setup();
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Camisa Blanca Clásica')).toBeInTheDocument();
      });

      const categoryFilter = screen.getByRole('combobox');
      await user.selectOptions(categoryFilter, 'Ropa');

      expect(screen.getByText('Camisa Blanca Clásica')).toBeInTheDocument();
      expect(screen.getByText('Jeans Azules')).toBeInTheDocument();
      expect(screen.queryByText('Zapatos Deportivos')).not.toBeInTheDocument();
      expect(screen.queryByText('Reloj Elegante')).not.toBeInTheDocument();
    });

    it('should filter by Zapatos category', async () => {
      const user = userEvent.setup();
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Camisa Blanca Clásica')).toBeInTheDocument();
      });

      const categoryFilter = screen.getByRole('combobox');
      await user.selectOptions(categoryFilter, 'Zapatos');

      expect(screen.getByText('Zapatos Deportivos')).toBeInTheDocument();
      expect(screen.queryByText('Camisa Blanca Clásica')).not.toBeInTheDocument();
    });

    it('should filter by Accesorios category', async () => {
      const user = userEvent.setup();
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Reloj Elegante')).toBeInTheDocument();
      });

      const categoryFilter = screen.getByRole('combobox');
      await user.selectOptions(categoryFilter, 'Accesorios');

      expect(screen.getByText('Reloj Elegante')).toBeInTheDocument();
      expect(screen.queryByText('Camisa Blanca Clásica')).not.toBeInTheDocument();
    });

    it('should combine search and category filters', async () => {
      const user = userEvent.setup();
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Camisa Blanca Clásica')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/buscar productos/i);
      await user.type(searchInput, 'Camisa');

      const categoryFilter = screen.getByRole('combobox');
      await user.selectOptions(categoryFilter, 'Ropa');

      expect(screen.getByText('Camisa Blanca Clásica')).toBeInTheDocument();
      expect(screen.queryByText('Jeans Azules')).not.toBeInTheDocument();
    });
  });

  describe('Product Creation', () => {
    it('should open modal when "Agregar Nuevo Producto" is clicked', async () => {
      const user = userEvent.setup();
      render(<App />);

      await waitFor(() => {
        expect(screen.queryByText('Camisa Blanca Clásica')).toBeInTheDocument();
      });

      // Switch to admin mode
      const toggleButton = screen.getByRole('button', { name: /modo cliente/i });
      await user.click(toggleButton);

      const addButton = screen.getByRole('button', { name: /agregar nuevo producto/i });
      await user.click(addButton);

      expect(screen.getByText('Nuevo Producto')).toBeInTheDocument();
    });

    it('should create new product successfully', async () => {
      const user = userEvent.setup();
      const newProduct = { ...mockProducts[0], productId: 'new-123', name: 'Producto Nuevo' };
      vi.mocked(api.createProduct).mockResolvedValue(newProduct);

      render(<App />);

      await waitFor(() => {
        expect(screen.queryByText('Camisa Blanca Clásica')).toBeInTheDocument();
      });

      // Switch to admin mode
      const toggleButton = screen.getByRole('button', { name: /modo cliente/i });
      await user.click(toggleButton);

      // Open modal
      const addButton = screen.getByRole('button', { name: /agregar nuevo producto/i });
      await user.click(addButton);

      // Fill form
      await user.type(screen.getByLabelText(/nombre del producto/i), mockProductInput.name);
      await user.type(screen.getByLabelText(/descripción/i), mockProductInput.description);
      await user.type(screen.getByLabelText(/precio/i), mockProductInput.price.toString());
      await user.type(screen.getByLabelText(/stock/i), mockProductInput.stock.toString());
      await user.type(screen.getByLabelText(/url de imagen/i), mockProductInput.imageUrl);

      // Submit
      const createButton = screen.getByRole('button', { name: /crear/i });
      await user.click(createButton);

      // Modal should close
      await waitFor(() => {
        expect(screen.queryByText('Nuevo Producto')).not.toBeInTheDocument();
      });

      expect(api.createProduct).toHaveBeenCalledWith(mockProductInput);
    });

    it('should keep the form open and show the error when creation fails', async () => {
      const user = userEvent.setup();
      vi.mocked(api.createProduct).mockRejectedValue(new Error('Creation failed'));

      render(<App />);

      await waitFor(() => {
        expect(screen.queryByText('Camisa Blanca Clásica')).toBeInTheDocument();
      });

      // Switch to admin mode
      const toggleButton = screen.getByRole('button', { name: /modo cliente/i });
      await user.click(toggleButton);

      // Open modal
      const addButton = screen.getByRole('button', { name: /agregar nuevo producto/i });
      await user.click(addButton);

      // Fill form
      await user.type(screen.getByLabelText(/nombre del producto/i), mockProductInput.name);
      await user.type(screen.getByLabelText(/descripción/i), mockProductInput.description);
      await user.type(screen.getByLabelText(/precio/i), mockProductInput.price.toString());
      await user.type(screen.getByLabelText(/stock/i), mockProductInput.stock.toString());
      await user.type(screen.getByLabelText(/url de imagen/i), mockProductInput.imageUrl);

      // Submit
      const createButton = screen.getByRole('button', { name: /crear/i });
      await user.click(createButton);

      expect(await screen.findByRole('alert')).toHaveTextContent('Creation failed');
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByLabelText(/nombre del producto/i)).toHaveValue(mockProductInput.name);
    });
  });

  describe('Product Update', () => {
    it('should open modal with product data when edit is clicked', async () => {
      const user = userEvent.setup();
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Camisa Blanca Clásica')).toBeInTheDocument();
      });

      // Switch to admin mode
      const toggleButton = screen.getByRole('button', { name: /modo cliente/i });
      await user.click(toggleButton);

      // Click edit on first product
      const editButtons = screen.getAllByRole('button', { name: /editar/i });
      await user.click(editButtons[0]);

      expect(screen.getByText('Editar Producto')).toBeInTheDocument();
      expect(screen.getByLabelText(/nombre del producto/i)).toHaveValue('Camisa Blanca Clásica');
    });

    it('should update product successfully', async () => {
      const user = userEvent.setup();
      const updatedProduct = { ...mockProducts[0], price: 59.99 };
      vi.mocked(api.updateProduct).mockResolvedValue(updatedProduct);

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Camisa Blanca Clásica')).toBeInTheDocument();
      });

      // Switch to admin mode
      const toggleButton = screen.getByRole('button', { name: /modo cliente/i });
      await user.click(toggleButton);

      // Click edit
      const editButtons = screen.getAllByRole('button', { name: /editar/i });
      await user.click(editButtons[0]);

      // Update price
      const priceInput = screen.getByLabelText(/precio/i);
      await user.clear(priceInput);
      await user.type(priceInput, '59.99');

      // Submit
      const updateButton = screen.getByRole('button', { name: /actualizar/i });
      await user.click(updateButton);

      await waitFor(() => {
        expect(screen.queryByText('Editar Producto')).not.toBeInTheDocument();
      });

      expect(api.updateProduct).toHaveBeenCalled();
    });
  });

  describe('Product Deletion', () => {
    it('should delete product with confirmation', async () => {
      const user = userEvent.setup();
      vi.mocked(api.deleteProduct).mockResolvedValue(undefined);

      // Mock window.confirm
      const confirmMock = vi.spyOn(window, 'confirm').mockReturnValue(true);

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Camisa Blanca Clásica')).toBeInTheDocument();
      });

      // Switch to admin mode
      const toggleButton = screen.getByRole('button', { name: /modo cliente/i });
      await user.click(toggleButton);

      // Click delete
      const deleteButtons = screen.getAllByRole('button', { name: /eliminar/i });
      await user.click(deleteButtons[0]);

      expect(confirmMock).toHaveBeenCalled();
      expect(api.deleteProduct).toHaveBeenCalledWith('test-product-123');

      confirmMock.mockRestore();
    });

    it('should not delete if confirmation is cancelled', async () => {
      const user = userEvent.setup();

      // Mock window.confirm to return false
      const confirmMock = vi.spyOn(window, 'confirm').mockReturnValue(false);

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Camisa Blanca Clásica')).toBeInTheDocument();
      });

      // Switch to admin mode
      const toggleButton = screen.getByRole('button', { name: /modo cliente/i });
      await user.click(toggleButton);

      // Click delete
      const deleteButtons = screen.getAllByRole('button', { name: /eliminar/i });
      await user.click(deleteButtons[0]);

      expect(confirmMock).toHaveBeenCalled();
      expect(api.deleteProduct).not.toHaveBeenCalled();

      confirmMock.mockRestore();
    });
  });

  describe('Error Handling', () => {
    it('should display error message when loading products fails', async () => {
      vi.mocked(api.listProducts).mockRejectedValue(new Error('Failed to load products'));

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText(/error/i)).toBeInTheDocument();
      });

      expect(screen.getByText(/failed to load products/i)).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no products exist', async () => {
      vi.mocked(api.listProducts).mockResolvedValue([]);

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText(/no se encontraron productos/i)).toBeInTheDocument();
      });

      expect(screen.getByText(/agrega productos para comenzar/i)).toBeInTheDocument();
    });
  });

  describe('Footer', () => {
    it('should render footer', () => {
      render(<App />);

      expect(screen.getByText(/TechModa © 2024/i)).toBeInTheDocument();
      expect(screen.getByText(/E-commerce de Moda Serverless/i)).toBeInTheDocument();
    });
  });
});
