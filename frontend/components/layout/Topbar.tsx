import {
  Avatar,
  Badge,
  Box,
  Button,
  Divider,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerHeader,
  DrawerOverlay,
  Flex,
  HStack,
  Icon,
  IconButton,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Spacer,
  Text,
  Tooltip,
  useDisclosure,
  VStack,
} from '@chakra-ui/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { FiBell, FiCheck, FiExternalLink, FiLogOut, FiMenu, FiMoon, FiSun, FiUser, FiHome, FiCalendar, FiBarChart2, FiUsers, FiActivity, FiMessageCircle, FiSettings } from 'react-icons/fi';
import { MdOutlineAdminPanelSettings } from 'react-icons/md';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useThemeMode } from '../../context/ThemeContext';
import { listNotifications, markNotificationRead, markAllNotificationsRead } from '../../services/notifications';
import type { Notification } from '../../types/domain';

const formatNotificationTime = (date?: string) => {
  if (!date) return '';
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'agora';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
};

const getNotificationMessage = (n: Notification): { title: string; subtitle?: string } => {
  switch (n.type) {
    case 'NEW_MESSAGE': {
      const senderName = n.payload?.senderName as string | undefined;
      const preview = n.payload?.preview ? String(n.payload.preview) : undefined;
      return { 
        title: senderName ? `Mensagem de ${senderName}` : 'Nova mensagem', 
        subtitle: preview || 'Tens uma nova mensagem no chat' 
      };
    }
    case 'MISSED_WORKOUT': {
      const clientName = n.payload?.clientName as string | undefined;
      return { 
        title: 'Treino perdido', 
        subtitle: clientName ? `${clientName} faltou ao treino` : 'Um cliente faltou ao treino' 
      };
    }
    case 'WORKOUT_DONE': {
      const clientName = n.payload?.clientName as string | undefined;
      return { 
        title: 'Treino concluído', 
        subtitle: clientName ? `${clientName} completou o treino` : 'Um cliente completou o treino' 
      };
    }
    case 'NEW_PLAN': {
      const title = n.payload?.title as string | undefined;
      return { title: 'Novo plano de treino', subtitle: title ? `O teu treinador criou: ${title}` : 'Foi criado um novo plano para ti' };
    }
    case 'NEW_CLIENT':
      return { title: 'Novo cliente', subtitle: 'Foi-te atribuído um novo cliente' };
    case 'TRAINER_CHANGE_REQUEST':
      return { title: 'Pedido de alteração', subtitle: 'Novo pedido de mudança de treinador' };
    case 'TRAINER_CHANGE_DECIDED': {
      const status = n.payload?.status as string | undefined;
      return { title: 'Pedido decidido', subtitle: `O teu pedido foi ${status === 'APPROVED' ? 'aprovado' : 'rejeitado'}` };
    }
    case 'TRAINER_APPROVED':
      return { title: 'Parabéns!', subtitle: 'Foste aprovado como treinador' };
    case 'TRAINER_REJECTED': {
      const reason = n.payload?.reason as string | undefined;
      return { title: 'Candidatura rejeitada', subtitle: reason || 'A tua candidatura foi rejeitada' };
    }
    case 'ALERT': {
      const msg = n.payload?.message as string | undefined;
      return { 
        title: 'Alerta do treinador', 
        subtitle: msg || 'Sem mensagem adicional' 
      };
    }
    default:
      return { title: 'Notificação', subtitle: undefined };
  }
};

const Topbar = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useThemeMode();
  const { socket } = useSocket();
  const qc = useQueryClient();
  const { isOpen: isDrawerOpen, onOpen: openDrawer, onClose: closeDrawer } = useDisclosure();

  // Mobile nav items (same as SidebarNav)
  const mobileNavItems = [
    { label: 'Dashboard', to: '/dashboard', icon: FiHome },
    { label: 'Calendário', to: '/trainings', icon: FiCalendar, roles: ['CLIENT'] },
    { label: 'Planos', to: '/plans', icon: FiBarChart2, roles: ['TRAINER'] },
    { label: 'Clientes', to: '/clients', icon: FiUsers, roles: ['TRAINER'] },
    { label: 'Treinadores', to: '/trainers', icon: FiActivity },
    { label: 'Chat', to: '/chat', icon: FiMessageCircle, roles: ['CLIENT', 'TRAINER'] },
    { label: 'Perfil', to: '/profile', icon: FiSettings },
    { label: 'Admin', to: '/admin', icon: MdOutlineAdminPanelSettings, roles: ['ADMIN'] },
  ];

  const canSee = (item: { roles?: string[] }) => {
    if (!item.roles) return true;
    if (!user) return false;
    return item.roles.includes(user.role);
  };

  // Listen for real-time notifications via WebSocket
  useEffect(() => {
    if (!socket) return;

    const handleNewNotification = () => {
      // Invalidate and refetch notifications when a new one arrives
      qc.invalidateQueries({ queryKey: ['notifications'] });
    };

    socket.on('notification:new', handleNewNotification);

    return () => {
      socket.off('notification:new', handleNewNotification);
    };
  }, [socket, qc]);

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => listNotifications(),
    refetchInterval: 10000, // Poll every 10 seconds for faster updates
    enabled: Boolean(user),
  });

  const markReadMutation = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <>
    <Flex
      as="header"
      align="center"
      gap={3}
      px={6}
      py={4}
      borderBottom="1px solid"
      borderColor="border"
      bg="rgba(255,255,255,0.7)"
      _dark={{ bg: 'rgba(17,24,39,0.8)' }}
      backdropFilter="blur(12px)"
      position="relative"
      zIndex="sticky"
    >
      {/* Hamburger menu - mobile only */}
      <IconButton
        aria-label="Menu"
        icon={<FiMenu />}
        variant="ghost"
        display={{ base: 'flex', md: 'none' }}
        onClick={openDrawer}
      />

      <Text fontWeight={700} letterSpacing="widest" fontSize={{ base: 'sm', md: 'md' }}>
        {user ? `Olá, ${user.profile.firstName}!` : 'Vigora PT'}
      </Text>
      <Badge colorScheme="brand" borderRadius="full" display={{ base: 'none', sm: 'flex' }}>
        {user?.role ?? 'GUEST'}
      </Badge>

      <Spacer />

      <HStack spacing={2}>
        <Tooltip label="Ir para Swagger">
          <IconButton
            aria-label="Swagger"
            icon={<FiExternalLink />}
            variant="ghost"
            onClick={() => window.open('/api-docs', '_blank')}
          />
        </Tooltip>

        {/* Notifications Dropdown */}
        <Menu>
          <MenuButton
            as={IconButton}
            aria-label="Notificações"
            icon={
              <Box position="relative">
                <FiBell />
                {unreadCount > 0 && (
                  <Badge
                    colorScheme="red"
                    borderRadius="full"
                    position="absolute"
                    top="-8px"
                    right="-8px"
                    fontSize="xs"
                    minW="18px"
                    textAlign="center"
                  >
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Badge>
                )}
              </Box>
            }
            variant="ghost"
          />
          <MenuList maxH="400px" overflowY="auto" minW="320px">
            <Box px={3} py={2}>
              <Flex justify="space-between" align="center">
                <Text fontWeight={700}>Notificações</Text>
                <HStack spacing={2}>
                  {unreadCount > 0 && (
                    <Badge colorScheme="brand">{unreadCount} não lida{unreadCount > 1 ? 's' : ''}</Badge>
                  )}
                  {notifications.length > 0 && (
                    <Button
                      size="xs"
                      variant="ghost"
                      colorScheme="brand"
                      onClick={() => markAllReadMutation.mutate()}
                      isLoading={markAllReadMutation.isPending}
                    >
                      Limpar
                    </Button>
                  )}
                </HStack>
              </Flex>
            </Box>
            <Divider />
            {notifications.length === 0 ? (
              <Box px={3} py={4} textAlign="center">
                <Text color="muted" fontSize="sm">Sem notificações</Text>
              </Box>
            ) : (
              notifications.slice(0, 10).map((n: Notification) => (
                <MenuItem
                  key={n._id}
                  onClick={() => {
                    if (!n.isRead && n._id) {
                      markReadMutation.mutate(n._id);
                    }
                  }}
                  bg={n.isRead ? 'transparent' : 'rgba(51,183,158,0.08)'}
                  _dark={n.isRead ? {} : { bg: 'rgba(51,183,158,0.15)' }}
                >
                  <Flex justify="space-between" align="center" w="100%">
                    <Box flex="1" mr={2}>
                      <Text fontSize="sm" fontWeight={n.isRead ? 400 : 600}>
                        {getNotificationMessage(n).title}
                      </Text>
                      {getNotificationMessage(n).subtitle && (
                        <Text fontSize="xs" color="muted" noOfLines={2}>
                          {getNotificationMessage(n).subtitle}
                        </Text>
                      )}
                      <Text fontSize="xs" color="muted" mt={1}>
                        {formatNotificationTime(n.createdAt)}
                      </Text>
                    </Box>
                    {!n.isRead && (
                      <Tooltip label="Marcar como lida">
                        <IconButton
                          aria-label="Marcar como lida"
                          icon={<FiCheck />}
                          size="xs"
                          variant="ghost"
                          colorScheme="brand"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (n._id) markReadMutation.mutate(n._id);
                          }}
                        />
                      </Tooltip>
                    )}
                  </Flex>
                </MenuItem>
              ))
            )}
            {notifications.length > 10 && (
              <>
                <Divider />
                <Box px={3} py={2} textAlign="center">
                  <Text fontSize="xs" color="muted">
                    +{notifications.length - 10} notificações mais antigas
                  </Text>
                </Box>
              </>
            )}
          </MenuList>
        </Menu>

        <IconButton
          aria-label="Alternar tema"
          icon={theme === 'dark' ? <FiSun /> : <FiMoon />}
          variant="ghost"
          onClick={toggleTheme}
        />

        <Menu>
          <MenuButton as={Button} leftIcon={<FiUser />} variant="outline">
            {user?.username ?? 'Conta'}
          </MenuButton>
          <MenuList>
            <MenuItem onClick={() => (window.location.href = '/profile')}>Perfil</MenuItem>
            {user?.role !== 'ADMIN' && (
              <MenuItem onClick={() => (window.location.href = '/chat')}>Chat</MenuItem>
            )}
            <MenuItem icon={<FiLogOut />} onClick={logout}>
              Terminar sessão
            </MenuItem>
          </MenuList>
        </Menu>

        <Avatar
          size="sm"
          name={`${user?.profile.firstName ?? ''} ${user?.profile.lastName ?? ''}`}
          src={user?.profile.avatarUrl}
          ml={2}
          display={{ base: 'none', sm: 'flex' }}
        />
      </HStack>
    </Flex>

    {/* Mobile Navigation Drawer */}
    <Drawer isOpen={isDrawerOpen} placement="left" onClose={closeDrawer}>
      <DrawerOverlay />
      <DrawerContent bg="rgba(14,18,27,0.95)" color="white">
        <DrawerCloseButton />
        <DrawerHeader borderBottomWidth="1px" borderColor="rgba(255,255,255,0.1)">
          Vigora PT
        </DrawerHeader>
        <DrawerBody>
          <VStack align="stretch" spacing={2} mt={4}>
            {mobileNavItems.filter(canSee).map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={closeDrawer}
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
                    py={3}
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
        </DrawerBody>
      </DrawerContent>
    </Drawer>
    </>
  );
};

export default Topbar;
