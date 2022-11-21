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
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      const newCart = [...cart];
      const productExistsOnCart = newCart.find((product) => product.id === productId);

      if(productExistsOnCart) {
        const newAmount = productExistsOnCart.amount + 1;

        if(newAmount > stockOfProduct.amount) {
          toast.error("Quantidade solicitada fora de estoque");
          return;
        }

        productExistsOnCart.amount = newAmount;
      } else {
        const newProduct = await api.get(`/products/${productId}`).then((productData) => {
          return {
            ...productData.data,
            amount: 1
          }
        });

        newCart.push(newProduct);
      }
      
      setCart(newCart);
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCart));
    } catch {
      toast.error('Erro na adição do produto');
      return;
    }
  };

  const removeProduct = (productId: number) => {
    try {
      if(!cart.find((product) => product.id === productId)) {
        throw new Error();
      }

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
      if(amount <= 0) {
        return;
      }

      const stockOfProduct: Stock = 
        await api.get(`/stock/${productId}`).then((stockDataOfProduct) => stockDataOfProduct.data);

      const newCart = [...cart];
      const productToUpdate = newCart.find((product) => product.id === productId);

      if(!productToUpdate) {
        throw new Error();
      }

      if((amount > stockOfProduct.amount)) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      productToUpdate.amount = amount;
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
