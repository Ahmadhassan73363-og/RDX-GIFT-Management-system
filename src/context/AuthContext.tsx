import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types/user';
import { Permission, Role } from '../types/rbac';
import { dataService } from '../services/dataService';

interface AuthContextType {
  currentUser: User;
  users: User[];
  roles: Role[];
  permissions: Permission[];
  hasPermission: (permission: Permission) => boolean;
  switchUser: (userId: string) => void;
  refreshUserData: () => void;
  isAuthenticated: boolean;
  login: (email: string, password?: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUserState] = useState<User>(() => dataService.getCurrentUser());
  const [users, setUsers] = useState<User[]>(() => dataService.getUsers());
  const [roles, setRoles] = useState<Role[]>(() => dataService.getRoles());
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);

  const refreshUserData = () => {
    const updatedUsers = dataService.getUsers();
    const updatedRoles = dataService.getRoles();
    const updatedCurrent = dataService.getCurrentUser();
    setUsers(updatedUsers);
    setRoles(updatedRoles);
    setCurrentUserState(updatedCurrent);
  };

  const switchUser = (userId: string) => {
    dataService.setCurrentUser(userId);
    refreshUserData();
  };

  const hasPermission = (permission: Permission): boolean => {
    return dataService.hasPermission(currentUser, permission);
  };

  const currentRole = roles.find(r => r.id === currentUser.roleId);
  const permissions = currentRole ? currentRole.permissions : [];

  const login = (email: string, password?: string): boolean => {
    const found = users.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
    if (!found) {
      throw new Error('No account found matching this corporate email address.');
    }
    if (found.status === 'disabled') {
      throw new Error('This account has been deactivated by an administrator.');
    }
    if (found.password && password && found.password !== password) {
      throw new Error('Invalid password. Please check your credentials.');
    }
    switchUser(found.id);
    setIsAuthenticated(true);
    return true;
  };

  const logout = () => {
    // For demo purposes, we log out or switch to viewer
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        users,
        roles,
        permissions,
        hasPermission,
        switchUser,
        refreshUserData,
        isAuthenticated,
        login,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
