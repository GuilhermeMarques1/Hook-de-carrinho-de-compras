import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');
    
    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const stockOfProduct: Stock = 
        await api.get(`/stock/${productId}`).then((stockDataOfProduct) => stockDataOfProduct.data);
      
      if(stockOfProduct.amount === 0) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      if(cart.find((product) => product.id === productId)) {
        updateProductAmount({productId: productId, amount: 1});
      } else { 
        await api.get(`/products/${productId}`).then((productData) => {
          const newProduct = {
            ...productData.data,
            amount: 1,
          };
  
          setCart([
            ...cart,
            newProduct
          ]);

          localStorage.setItem("@RocketShoes:cart", JSON.stringify(cart));
        });
      }
    } catch {
      toast.error('Erro na adição do produto');
      return;
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const newCart = cart.filter((product) => product.id !== productId);
      setCart(newCart);
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCart));
    } catch {
      toast.error('Erro na remoção do produto');
      return;
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const stockOfProduct: Stock = 
        await api.get(`/stock/${productId}`).then((stockDataOfProduct) => stockDataOfProduct.data);

      const productToUpdate = cart.find((product) => product.id === productId);
      if(productToUpdate && (productToUpdate.amount + amount > stockOfProduct.amount)) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const newCart = cart.map((product) => {
        if(product.id === productId) {
          const productUpdated = Object.assign({}, product);
          productUpdated.amount += amount;
          
          return productUpdated;
        } else {
          return product
        }
      });

      setCart(newCart);
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCart)); 
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
      return;
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
