// UI component: Sidebar Nav.

import { Box, Flex, Heading, Icon, Text, VStack } from '@chakra-ui/react';
import { NavLink } from 'react-router-dom';
import { FiActivity, FiBarChart2, FiCalendar, FiHome, FiMessageCircle, FiSettings, FiUsers } from 'react-icons/fi';
import { MdOutlineAdminPanelSettings } from 'react-icons/md';
import { IconType } from 'react-icons';
import { useAuth } from '../../context/AuthContext';

interface NavItem {
  label: string;
  to: string;
  icon: IconType;
  roles?: string[];
}

const navItems: NavItem[] = [
  { label: 'Dashboard', to: '/dashboard', icon: FiHome },
  { label: 'Calendário', to: '/trainings', icon: FiCalendar, roles: ['CLIENT'] },
  { label: 'Planos', to: '/plans', icon: FiBarChart2, roles: ['TRAINER'] },
  { label: 'Clientes', to: '/clients', icon: FiUsers, roles: ['TRAINER'] },
  { label: 'Treinadores', to: '/trainers', icon: FiActivity },
  { label: 'Chat', to: '/chat', icon: FiMessageCircle },
  { label: 'Perfil', to: '/profile', icon: FiSettings },
  { label: 'Admin', to: '/admin', icon: MdOutlineAdminPanelSettings, roles: ['ADMIN'] },
];

const SidebarNav = () => {
  const { user } = useAuth();

  const canSee = (item: NavItem) => {
    if (!item.roles) return true;
    if (!user) return false;
    return item.roles.includes(user.role);
  };

  return (
    <Box
      as="aside"
      w={{ base: '220px', lg: '250px' }}
      bg="rgba(14,18,27,0.9)"
      color="white"
      backdropFilter="blur(8px)"
      borderRight="1px solid"
      borderColor="rgba(255,255,255,0.08)"
      p={5}
      position="sticky"
      top={0}
      h="100vh"
      overflowY="auto"
      css={{
        '&::-webkit-scrollbar': { display: 'none' },
        msOverflowStyle: 'none',
        scrollbarWidth: 'none',
      }}
    >
      <Heading size="md" letterSpacing="wide" mb={8} color="white">
        Vigora PT
      </Heading>

      <VStack align="stretch" spacing={2}>
        {navItems.filter(canSee).map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            style={({ isActive }) => ({
              textDecoration: 'none',
              color: isActive ? '#0f172a' : 'white',
            })}
          >
            {({ isActive }) => (
              <Flex
                align="center"
                gap={3}
                px={3}
                py={2.5}
                borderRadius="12px"
                bg={isActive ? 'white' : 'transparent'}
                boxShadow={isActive ? 'lg' : 'none'}
                color={isActive ? 'brand.600' : 'white'}
                _hover={{ bg: isActive ? 'white' : 'rgba(255,255,255,0.06)' }}
                transition="all 0.15s ease"
              >
                <Icon as={item.icon} />
                <Text fontWeight={600}>{item.label}</Text>
              </Flex>
            )}
          </NavLink>
        ))}
      </VStack>
    </Box>
  );
};

export default SidebarNav;
