import React, { useState } from 'react';
import {
  Box,
  HStack,
  VStack,
  Heading,
  Text,
  Button,
  IconButton,
  Drawer,
  DrawerBody,
  DrawerOverlay,
  DrawerContent,
  useDisclosure,
} from '@chakra-ui/react';
import { FiMenu } from 'react-icons/fi';
import { Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar: React.FC = () => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { isAuthenticated } = useAuth();
  const [scrolled, setScrolled] = useState(false);

  // Listen to scroll for shadow effect
  const handleScroll = () => {
    setScrolled(window.scrollY > 10);
  };

  React.useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { label: 'Home', path: '/' },
    { label: 'Trainers', path: '/trainers' },
    { label: 'Plans', path: '/plans' },
  ];

  const authLinks = [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Profile', path: '/profile' },
    { label: 'Chat', path: '/chat' },
  ];

  const displayLinks = isAuthenticated ? authLinks : navLinks;

  return (
    <>
      <Box
        as="nav"
        position="fixed"
        top={0}
        left={0}
        right={0}
        zIndex={100}
        bg="white"
        boxShadow={scrolled ? 'md' : 'none'}
        transition="box-shadow 0.3s ease"
        py={4}
        px={{ base: 4, md: 8 }}
      >
        <HStack maxW="7xl" mx="auto" justify="space-between" align="center">
          {/* Logo */}
          <RouterLink to="/">
            <HStack spacing={2} _hover={{ opacity: 0.8 }} transition="opacity 0.2s">
              <Box bg="brand.500" p={2} borderRadius="md">
                <Text fontWeight={800} color="white" fontSize="lg">
                  V
                </Text>
              </Box>
              <Heading as="h1" size="md" color="brand.700">
                Vigora
              </Heading>
            </HStack>
          </RouterLink>

          {/* Desktop Menu */}
          <HStack spacing={8} display={{ base: 'none', md: 'flex' }}>
            {displayLinks.map((link) => (
              <RouterLink key={link.path} to={link.path}>
                <Text
                  fontWeight={500}
                  color="gray.700"
                  _hover={{ color: 'brand.500', transition: 'color 0.2s' }}
                  cursor="pointer"
                >
                  {link.label}
                </Text>
              </RouterLink>
            ))}
          </HStack>

          {/* Desktop CTA */}
          <HStack spacing={3} display={{ base: 'none', md: 'flex' }}>
            {!isAuthenticated && (
              <>
                <Button as={RouterLink} to="/login" variant="ghost" colorScheme="brand">
                  Entrar
                </Button>
                <Button as={RouterLink} to="/register" colorScheme="accent" bg="accent.500" color="white">
                  Registar
                </Button>
              </>
            )}
            {isAuthenticated && (
              <Button as={RouterLink} to="/dashboard" colorScheme="brand" bg="brand.500" color="white">
                Dashboard
              </Button>
            )}
          </HStack>

          {/* Mobile Menu Trigger */}
          <IconButton
            aria-label="menu"
            icon={<FiMenu />}
            display={{ base: 'flex', md: 'none' }}
            onClick={onOpen}
            variant="ghost"
          />
        </HStack>
      </Box>

      {/* Mobile Drawer Menu */}
      <Drawer isOpen={isOpen} placement="right" onClose={onClose} size="xs">
        <DrawerOverlay />
        <DrawerContent>
          <DrawerBody pt={20}>
            <VStack align="start" spacing={6}>
              {displayLinks.map((link) => (
                <RouterLink key={link.path} to={link.path} onClick={onClose}>
                  <Text fontWeight={500} fontSize="lg" _hover={{ color: 'brand.500' }}>
                    {link.label}
                  </Text>
                </RouterLink>
              ))}
              <Box w="100%" pt={4} borderTop="1px solid" borderColor="gray.200">
                {!isAuthenticated && (
                  <VStack spacing={3} w="100%">
                    <Button as={RouterLink} to="/login" w="100%" variant="ghost">
                      Entrar
                    </Button>
                    <Button as={RouterLink} to="/register" w="100%" colorScheme="accent" bg="accent.500" color="white">
                      Registar
                    </Button>
                  </VStack>
                )}
              </Box>
            </VStack>
          </DrawerBody>
        </DrawerContent>
      </Drawer>

      {/* Spacer */}
      <Box h={{ base: 16, md: 20 }} />
    </>
  );
};

export default Navbar;
