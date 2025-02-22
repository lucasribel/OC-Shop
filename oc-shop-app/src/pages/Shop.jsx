import { Box, Flex, Image, Text, Button, VStack, Heading, SimpleGrid, Input, Tag } from "@chakra-ui/react";
import {SelectContent,SelectItem,SelectRoot,SelectTrigger,SelectValueText,} from "@/components/ui/select"
import { useState } from "react";

function ProductCard({ product, onAddToCart }) {
    const [size, setSize] = useState(""); // Estado para guardar o tamanho selecionado
    const [color, setColor] = useState(""); // Estado para guardar a cor selecionada
    const [quantity, setQuantity] = useState(1); // Estado para guardar a quantidade (padrão é 1)

    // Função para lidar com o clique no botão
    const handleAddToCart = () => {
        // Verifica se o produto tem tamanhos e se o usuário escolheu um
        if (product.sizes && !size) {
        alert("Por favor, escolha um tamanho.");
        return;
        }
        // Verifica se o produto tem cores e se o usuário escolheu uma
        if (product.cores && !color) {
        alert("Por favor, escolha uma cor.");
        return;
        }
        // Verifica se foi selecionado pelo menos 1
        if (quantity < 1) {
            alert("A quantidade deve ser pelo menos 1.");
            return;
        }
        // Passa o produto e as escolhas para a função onAddToCart
        onAddToCart(product, size, color, quantity);
    };

    return (
        <Box borderWidth="1px" borderRadius="lg" overflow="hidden" p={4} boxShadow="md">
          <Image src={product.image} alt={product.name} boxSize="150px" objectFit="cover" />
          <VStack spacing={2} align="stretch">
            <Text fontWeight="bold">{product.name}</Text>
            <Text>R$ {Number(product.price).toFixed(2)}</Text>
            
            <Flex>
                {/* Select para Tamanhos (se existir) */}
                {product.sizes && (
                  <SelectRoot onValueChange={(value) => setSize(value.value[0])}>
                    <SelectTrigger >
                      <SelectValueText placeholder="Tamanho"/>
                    </SelectTrigger>
                    <SelectContent>
                      {product.sizes.map((s) => (
                        <SelectItem item={s} key={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </SelectRoot>
                )}
                {/* Select para Cores (se existir) */}
                {product.cores && (
                  <SelectRoot onValueChange={(value) => setColor(value.value[0])}>
                    <SelectTrigger>
                      <SelectValueText placeholder="Cor" />
                    </SelectTrigger>
                    <SelectContent>
                      {product.cores.map((c) => (
                        <SelectItem item={c} key={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </SelectRoot>
                )}
            </Flex>

            {/* Input para Quantidade */}
            <Flex align='center' paddingLeft='0.5rem' gap='0.25rem'>
                <Text>Quantidade:</Text>
                <Input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                placeholder="Quantidade"
                width="100px"
                />
            </Flex>
    
            {/* Botão para adicionar ao carrinho */}
            <Button colorPalette="red" onClick={handleAddToCart}>
              Adicionar ao Carrinho
            </Button>
          </VStack>
        </Box>
      );
}

function Shop() {
    const [cart, setCart] = useState([]);
    const [showCheckout, setShowCheckout] = useState(false);
    const [userDetails, setUserDetails] = useState({
        name: "",
        phone: "",
        telegram: "",
        office: "",
        paymentMethod: "",
        deliveryMethod: "",
        retrievalContact: "", 
      });

    const removeFromCart = (index) => {
        setCart(cart.filter((_, i) => i !== index));
      };
  
    const addToCart = (product, size, color, quantity) => {
        setCart([...cart, { 
          ...product, 
          size: size || "Sem tamanho", // Define "Sem tamanho" se size for "" ou undefined
          color: color || "Sem cor",   // Define "Sem cor" se color for "" ou undefined
          quantity: quantity           // Quantidade já é garantida como >= 1 pelo handleAddToCart
        }]);
        console.log("Item adicionado:", { ...product, size, color, quantity });
      };

    const handleFinalCheckout = async () => {
        if (
          !userDetails.name ||
          !userDetails.telegram ||
          !userDetails.office ||
          !userDetails.paymentMethod ||
          !userDetails.deliveryMethod
        ) {
          alert("Por favor, preencha todos os campos.");
          return;
        }
      
        const orderId = new Date().toISOString(); // ID único baseado no timestamp
        const orderData = {
          orderId,
          name: userDetails.name,
          phone: userDetails.phone,
          telegram: userDetails.telegram,
          office: userDetails.office,
          paymentMethod: userDetails.paymentMethod,
          deliveryMethod: userDetails.deliveryMethod,
          retrievalContact: userDetails.retrievalContact || "",
          total: totalAmount,
        };
      
        try {
          // Enviar cabeçalho do pedido
          const headerResponse = await fetch("https://script.google.com/macros/s/AKfycbwk7nbKeVhpuS4wL8h0vef_y3iA8B8rBLXP9VU3qpKsxi1geOGeS4TAe7Od7JgpkPlW2A/exec", {
            method: "POST",
            body: JSON.stringify({ action: "addOrder", data: orderData }),
          });
      
          if (!headerResponse.ok) {
            throw new Error("Erro ao enviar cabeçalho do pedido");
          }
      
          // Enviar itens do pedido
          const itemsWithOrderId = cart.map(item => ({
            ...item,
            orderId: orderId,  // Adiciona o orderId a cada item
          }));
          const itemsResponse = await fetch("https://script.google.com/macros/s/AKfycbwk7nbKeVhpuS4wL8h0vef_y3iA8B8rBLXP9VU3qpKsxi1geOGeS4TAe7Od7JgpkPlW2A/exec", {
            method: "POST",
            body: JSON.stringify({ action: "addOrderItems", data: itemsWithOrderId }),
          });

          if (!itemsResponse.ok) {
            throw new Error("Erro ao enviar itens do pedido");
          }
      
          // Se tudo deu certo
          alert("Pedido enviado com sucesso!");
          setCart([]);
          setShowCheckout(false);
          setUserDetails({
            name: "",
            phone: "",
            telegram: "",
            office: "",
            paymentMethod: "",
            deliveryMethod: "",
            retrievalContact: "",
          });
        } catch (error) {
          console.error("Erro:", error);
          alert("Houve um erro ao enviar o pedido. Tente novamente.");
        }
      };
  
      const [products, setProducts] = useState([]);
        const fetchProducts = async () => {
        try {
            const response = await fetch("https://script.google.com/macros/s/AKfycbwk7nbKeVhpuS4wL8h0vef_y3iA8B8rBLXP9VU3qpKsxi1geOGeS4TAe7Od7JgpkPlW2A/exec?action=getProducts");
            const data = await response.json();
            setProducts(data);
        } catch (error) {
            console.error("Erro ao buscar produtos:", error);
        }
        };

// Chame fetchProducts quando o componente carregar
useState(() => {
  fetchProducts();
}, []);

    const totalAmount = cart.reduce((total, item) => total + item.price * item.quantity, 0).toFixed(2);
  
    return (
      <Box p={5}>
        <Heading mb={4}>🛒 Loja</Heading>
        <SimpleGrid columns={[1, 2, 3]} spacing={5}>
          {products.map((product) => (
            <ProductCard key={product.id} product={product} onAddToCart={addToCart} />
          ))}
        </SimpleGrid>
        <Box mt={6}>
          <Heading size="md" mb={2}>Carrinho</Heading>
          {cart.length === 0 ? (
            <Text>O carrinho está vazio.</Text>
          ) : (
            <VStack align="stretch" spacing={2}>
              {cart.map((item, index) => (
                <Box key={index} p={2} borderWidth="1px" borderRadius="md">
                  <Flex justify="space-between" align="center">
                    <Text>
                      {item.name} - Tamanho: {item.size} - Cor: {item.color} - Qtde: {item.quantity}
                    </Text>
                    <Button colorScheme="red" size="xs" onClick={() => removeFromCart(index)}>
                      Remover
                    </Button>
                  </Flex>
                </Box>
              ))}
            </VStack>
          )}
          {cart.length > 0 && (
            <>
              <Text mt={2} fontWeight="bold">
                Total: R$ {cart.reduce((total, item) => total + item.price * item.quantity, 0).toFixed(2)}
              </Text>
              <Button mt={2} colorScheme="green" onClick={() => setShowCheckout(true)}>
                Finalizar Pedido
              </Button>
            </>
          )}
        </Box>
        {showCheckout && (
  <Box mt={4} p={4} borderWidth="1px" borderRadius="md" maxWidth='30vw'>
    <Heading size="md" mb={4}>Finalizar Pedido</Heading>
    <VStack spacing={4}>
      <Input
        placeholder="Nome"
        value={userDetails.name}
        onChange={(e) => setUserDetails({ ...userDetails, name: e.target.value })}
      />
      <Input
        placeholder="Telefone"
        value={userDetails.phone}
        onChange={(e) => setUserDetails({ ...userDetails, phone: e.target.value })}
      />
      <Input
        placeholder="Telegram (ex: @usuario)"
        value={userDetails.telegram}
        onChange={(e) => setUserDetails({ ...userDetails, telegram: e.target.value })}
      />
      {/* Select para Escritório */}
      <SelectRoot
        onValueChange={(value) =>
          setUserDetails({ ...userDetails, office: value.value[0] })
        }
      >
        <SelectTrigger>
          <SelectValueText placeholder="Escritório" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem item="São Paulo">São Paulo</SelectItem>
          <SelectItem item="Rio de Janeiro">Rio de Janeiro</SelectItem>
          {/* Adicione mais escritórios aqui, se necessário */}
        </SelectContent>
      </SelectRoot>
      {/* Select para Método de Pagamento */}
      <SelectRoot
        onValueChange={(value) =>
          setUserDetails({ ...userDetails, paymentMethod: value.value[0] })
        }
      >
        <SelectTrigger>
          <SelectValueText placeholder="Método de Pagamento" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem item="PIX">PIX</SelectItem>
          <SelectItem item="Cartão de Crédito">Cartão de Crédito</SelectItem>
        </SelectContent>
      </SelectRoot>
      {userDetails.paymentMethod === "PIX" && (
        <Box mb={2}>
            Para pagar via PIX, envie o valor total do seu pedido para a chave: <strong>financeiro.brasil@aiesec.org.br</strong>. <br/> 
            <Tag.Root size='lg' backgroundColor='green.600'><Tag.Label>Valor total: <b>R${totalAmount}</b></Tag.Label></Tag.Root> <br/> 
            Lembre-se de enviar o comprovante conforme as instruções no início do site, ou então seu pedido será <b>desconsiderado</b>.
        </Box>
       )}
      {userDetails.paymentMethod === "Cartão de Crédito" && (
      <Text mt={2}>
          Entraremos em contato via e-mail para processar o pagamento com cartão de crédito.
      </Text>
      )}
      {/* Select para Método de Entrega */}
      <SelectRoot
        onValueChange={(value) =>
          setUserDetails({ ...userDetails, deliveryMethod: value.value[0] })
        }
      >
        <SelectTrigger>
          <SelectValueText placeholder="Método de Entrega" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem item="Retirada pessoal">Retirada pessoal</SelectItem>
          <SelectItem item="Outra pessoa retira">Outra pessoa retira</SelectItem>
        </SelectContent>
      </SelectRoot>
      {userDetails.deliveryMethod === "Outra pessoa retira" && (
      <>
      <Text>
          Para quem devemos entregar o seu pedido na conferência?
      </Text>
      <Input
      placeholder="Nome e telefone de quem vai retirar" mt={2}
      value={userDetails.retrievalContact}
      onChange={(e) => setUserDetails({ ...userDetails, retrievalContact: e.target.value })}
      />
      </>
      )}
      <Button colorScheme="green" onClick={handleFinalCheckout}>
        Finalizar Pedido
      </Button>
    </VStack>
  </Box>
)}
      </Box>
    );
  }

export default Shop;
