import React, { useEffect } from 'react';
import { AuthProvider, useAuth } from 'react-oidc-context';

// Helper function to get environment variable
const getEnvVar = (key: string): string | undefined => {
  if (typeof window !== 'undefined' && (window as any).__ENV__) {
    return (window as any).__ENV__[key];
  }
  return process.env[key];
};

// Component to handle authentication state
const AuthHandler: React.FC<{ onAuthenticated: () => void; onUnauthenticated: () => void }> = ({ 
  onAuthenticated, 
  onUnauthenticated 
}) => {
  const auth = useAuth();

  useEffect(() => {
    if (auth.isAuthenticated) {
      onAuthenticated();
    } else if (auth.error) {
      console.error('[KeycloakAuth] Authentication error:', auth.error);
      onUnauthenticated();
    } else if (!auth.isLoading && !auth.isAuthenticated && !auth.error) {
      // Not authenticated and not loading - trigger login
      auth.signinRedirect().catch(err => {
        console.error('[KeycloakAuth] Error during signin redirect:', err);
      });
    }
  }, [auth.isAuthenticated, auth.isLoading, auth.error, onAuthenticated, onUnauthenticated]);

  // Don't render anything - let the parent handle rendering based on isUnlocked state
  // The loading/error states are handled by showing/hiding the App component
  return null;
};

// Main AuthProvider wrapper
interface KeycloakAuthProps {
  children: React.ReactNode;
  onAuthenticated: () => void;
  onUnauthenticated: () => void;
}

export const KeycloakAuthProvider: React.FC<KeycloakAuthProps> = ({ 
  children, 
  onAuthenticated, 
  onUnauthenticated 
}) => {
  const keycloakUrl = getEnvVar('KEYCLOAK_URL');
  const realm = getEnvVar('KEYCLOAK_REALM');
  const clientId = getEnvVar('KEYCLOAK_CLIENT_ID');

  // Keycloak is required - this should not happen if AppWithAuth is working correctly
  if (!keycloakUrl || !realm || !clientId) {
    return (
      <div className="fixed inset-0 bg-gray-900 text-white flex flex-col justify-center items-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-8 shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-4">Configuration Error</h2>
            <p className="text-red-500 text-sm">
              Keycloak authentication is required but not configured.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const authority = `${keycloakUrl}/realms/${realm}`;
  const redirectUri = window.location.origin;

  // Log redirect URI for debugging (helpful for Keycloak configuration)
  console.log('[KeycloakAuth] Redirect URI:', redirectUri);
  console.log('[KeycloakAuth] Make sure this URI is in Keycloak "Valid redirect URIs":', redirectUri, 'or', `${redirectUri}/*`);

  const oidcConfig = {
    authority,
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid profile email',
    automaticSilentRenew: true,
    silent_redirect_uri: `${redirectUri}/silent-renew.html`,
    loadUserInfo: true,
    onSigninCallback: () => {
      // Remove code and state from URL after successful login
      window.history.replaceState({}, document.title, window.location.pathname);
    },
  };

  return (
    <AuthProvider {...oidcConfig}>
      <AuthHandler onAuthenticated={onAuthenticated} onUnauthenticated={onUnauthenticated} />
      {children}
    </AuthProvider>
  );
};

// Hook to use authentication in components
export const useKeycloakAuth = () => {
  return useAuth();
};

