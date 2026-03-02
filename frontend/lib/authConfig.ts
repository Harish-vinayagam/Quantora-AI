// lib/authConfig.ts
// Auth provider configuration stubs — plug in real providers without changing component code

export type AuthProvider = 'mock' | 'cognito' | 'jwt' | 'sso';

export interface AuthConfig {
    provider: AuthProvider;
    // AWS Cognito (placeholder)
    cognito?: {
        region: string;
        userPoolId: string;
        clientId: string;
    };
    // Custom JWT (placeholder)
    jwt?: {
        baseUrl: string;
        loginEndpoint: string;
        mfaEndpoint: string;
    };
    // SSO / SAML / LDAP (placeholder)
    sso?: {
        entryPoint: string;
        issuer: string;
    };
}

// ── Active configuration ──
// Change `provider` and fill in the relevant block when integrating a real backend.
export const authConfig: AuthConfig = {
    provider: 'mock',
};

// ── Auth service interface ──
// Each real provider should implement this contract.
export interface AuthService {
    /**
     * Validates credentials. Returns a session token or throws on failure.
     * Replace mock implementation with provider-specific logic.
     */
    login(identifier: string, password: string): Promise<{ sessionToken: string }>;

    /**
     * Validates a 6-digit OTP/MFA code. Returns access token or throws.
     */
    verifyMfa(sessionToken: string, code: string): Promise<{ accessToken: string }>;
}

// ── Mock implementation (used by default) ──
export const mockAuthService: AuthService = {
    async login(identifier, password) {
        await new Promise(r => setTimeout(r, 900)); // simulate network
        if (!identifier || password.length < 4) {
            throw new Error('Invalid credentials');
        }
        return { sessionToken: 'mock-session-token' };
    },

    async verifyMfa(_sessionToken, code) {
        await new Promise(r => setTimeout(r, 700));
        // Accept any 6-digit code for demo
        if (code.length !== 6) {
            throw new Error('Invalid verification code');
        }
        return { accessToken: 'mock-access-token' };
    },
};
