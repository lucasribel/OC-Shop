import { Box, Spacer, Heading, Flex, Button, Text, Input } from "@chakra-ui/react";
import {DrawerActionTrigger,DrawerBackdrop,DrawerBody,DrawerCloseTrigger,DrawerContent,DrawerFooter,DrawerHeader,DrawerRoot,DrawerTitle,DrawerTrigger,} from "@/components/ui/drawer"
import { useState, useEffect } from "react";

function ProductCard({ product }) {
    return (
      <Box w='90vw' borderWidth="1px" borderRadius="lg" p={4} boxShadow="md" backgroundColor='black'>
        <Flex>
          <Text fontWeight="bold">{product.name}</Text><Spacer />
          <Text>Preço: R$ {Number(product.price).toFixed(2)}</Text> {/* Ajustado aqui */}
        </Flex>
        <Flex>
          <Text>Tamanhos: {product.sizes.length > 0 ? product.sizes.join(", ") : "Nenhum"}</Text><Spacer />
          <Text>Cores: {product.cores.length > 0 ? product.cores.join(", ") : "Nenhuma"}</Text>
        </Flex>
          <Box>Imagem: {product.image}</Box>
          <Button colorScheme="blue" size="sm">Editar</Button>
          <Button colorScheme="red" size="sm">Excluir</Button>
      </Box>
    );
  }

  function Config() {
    const [products, setProducts] = useState([]);
    const [isAddModalOpen, setAddModalOpen] = useState(false); // Controla o modal
    const [newProduct, setNewProduct] = useState({
      name: "",
      price: "",
      sizes: "",
      cores: "",
      image: ""
    });
  
    const fetchProducts = async () => {
      try {
        const response = await fetch("https://script.google.com/macros/s/AKfycbwk7nbKeVhpuS4wL8h0vef_y3iA8B8rBLXP9VU3qpKsxi1geOGeS4TAe7Od7JgpkPlW2A/exec?action=getProducts");
        const data = await response.json();
        setProducts(data);
      } catch (error) {
        console.error("Erro ao buscar produtos:", error);
      }
    };
  
    const handleAddProduct = async () => {
      const productData = {
        id: products.length + 1, // ID temporário (será ajustado no futuro)
        name: newProduct.name,
        price: Number(newProduct.price), // Converte para número
        sizes: newProduct.sizes ? newProduct.sizes.split(",").map(s => s.trim()) : [],
        cores: newProduct.cores ? newProduct.cores.split(",").map(c => c.trim()) : [],
        image: newProduct.image || "https://via.placeholder.com/150" // Imagem padrão se vazia
      };
  
      try {
        const response = await fetch("https://script.google.com/macros/s/AKfycbwk7nbKeVhpuS4wL8h0vef_y3iA8B8rBLXP9VU3qpKsxi1geOGeS4TAe7Od7JgpkPlW2A/exec", {
          method: "POST",
          body: JSON.stringify({ action: "addProduct", data: productData }),
        });
  
        if (!response.ok) {
          throw new Error("Erro ao adicionar produto");
        }
  
        // Atualiza a lista de produtos
        setProducts([...products, productData]);
        setAddModalOpen(false);
        setNewProduct({ name: "", price: "", sizes: "", cores: "", image: "" });
      } catch (error) {
        console.error("Erro:", error);
        alert("Houve um erro ao adicionar o produto. Tente novamente.");
      }
    };
  
    useEffect(() => {
      fetchProducts();
    }, []);
  
    return (
      <Box p={5}>
        <Heading mb={4}>Configuração de Produtos</Heading>
        <DrawerRoot>
            <DrawerBackdrop />
            <DrawerTrigger asChild>
                <Button variant="outline" size="sm">
                Adicionar Novo Produto
                </Button>
            </DrawerTrigger>
            <DrawerContent>
                <DrawerHeader>
                <DrawerTitle>Adicionar Novo Produto</DrawerTitle>
                </DrawerHeader>
                <DrawerBody>
                    <Input
                    placeholder="Nome"
                    value={newProduct.name}
                    onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                    />
                    <Input
                    placeholder="Preço (ex: 49.90)"
                    type="number"
                    value={newProduct.price}
                    onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                    />
                    <Input
                    placeholder="Tamanhos (separados por vírgula, ex: P,M,G)"
                    value={newProduct.sizes}
                    onChange={(e) => setNewProduct({ ...newProduct, sizes: e.target.value })}
                    />
                    <Input
                    placeholder="Cores (separadas por vírgula, ex: Azul,Branco)"
                    value={newProduct.cores}
                    onChange={(e) => setNewProduct({ ...newProduct, cores: e.target.value })}
                    />
                    <Input
                    placeholder="URL da Imagem"
                    value={newProduct.image}
                    onChange={(e) => setNewProduct({ ...newProduct, image: e.target.value })}
                    />
                </DrawerBody>
                <DrawerFooter>
                <DrawerActionTrigger asChild>
                    <Button variant="outline">Cancelar</Button>
                </DrawerActionTrigger>
                <Button colorScheme="green" mr={3} onClick={handleAddProduct}>
                    Salvar
                </Button>
                </DrawerFooter>
                <DrawerCloseTrigger />
            </DrawerContent>
        </DrawerRoot>
        <Flex direction="column" gap="0.5rem" mt='0.5rem'>
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </Flex>
      </Box>
    );
  }

export default Config;