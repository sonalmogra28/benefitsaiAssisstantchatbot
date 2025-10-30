import { Client, AuthenticationProvider } from '@microsoft/microsoft-graph-client';
import { getAdB2CConfig } from './config';
import { logError } from '@/lib/logger';

// Type definitions
export interface CreateUserRequest {
  mail: string;
  displayName: string;
  companyId: string;
  role: string;
  password?: string;
}

// Custom authentication provider for Microsoft Graph
class GraphAuthProvider implements AuthenticationProvider {
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;

  async getAccessToken(): Promise<string> {
    // Check if we have a valid token
    if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.accessToken;
    }

    // Get new token using client credentials flow
    const adB2CConfig = getAdB2CConfig();
    const tokenEndpoint = `https://login.microsoftonline.com/${adB2CConfig.tenantName}.onmicrosoft.com/oauth2/v2.0/token`;
    
    const params = new URLSearchParams({
      client_id: adB2CConfig.clientId,
      client_secret: adB2CConfig.clientSecret,
      scope: 'https://graph.microsoft.com/.default',
      grant_type: 'client_credentials',
    });

    try {
      const response = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params,
      });

      if (!response.ok) {
        throw new Error(`Failed to get access token: ${response.statusText}`);
      }

      const tokenData = await response.json();
      this.accessToken = tokenData.access_token;
      this.tokenExpiry = new Date(Date.now() + (tokenData.expires_in * 1000) - 60000); // 1 minute buffer

      return this.accessToken!;
    } catch (error) {
      logError('Failed to get Microsoft Graph access token', error);
      throw new Error('Failed to authenticate with Microsoft Graph');
    }
  }
}

// Azure AD B2C User Service
export class AzureADB2CUserService {
  private graphClient: Client;

  constructor() {
    const authProvider = new GraphAuthProvider();
    this.graphClient = Client.initWithMiddleware({ authProvider });
  }

  /**
   * Create a new user in Azure AD B2C
   */
  async createUser(userData: {
    mail: string;
    displayName: string;
    companyId: string;
    role: string;
    password?: string;
  }): Promise<any> {
    try {
      const userObject = {
        accountEnabled: true,
        displayName: userData.displayName,
        mail: userData.mail,
        userPrincipalName: userData.mail,
        passwordProfile: {
          forceChangePasswordNextSignIn: true,
          password: userData.password || 'TempPassword123!',
        },
        extension_companyId: userData.companyId,
        extension_role: userData.role,
      };

      console.log('Creating Azure AD B2C user', {
        email: userData.mail,
        displayName: userData.displayName,
        companyId: userData.companyId,
        role: userData.role,
      });

      const createdUser = await this.graphClient.api('/users').post(userObject);

      console.log('Azure AD B2C user created successfully', {
        userId: createdUser.id,
        email: createdUser.mail,
        displayName: createdUser.displayName,
      });

      return createdUser;
    } catch (error) {
      logError('Failed to create Azure AD B2C user', error);
      throw new Error(`Failed to create user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<any> {
    try {
      const user = await this.graphClient.api(`/users/${userId}`).get();
      return user;
    } catch (error) {
      if ((error as any).statusCode === 404) {
        return null;
      }
      logError('Failed to get Azure AD B2C user', error);
      throw error;
    }
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email: string): Promise<any> {
    try {
      const users = await this.graphClient
        .api('/users')
        .filter(`mail eq '${email}'`)
        .get();

      return users.value && users.value.length > 0 ? users.value[0] : null;
    } catch (error) {
      logError('Failed to get Azure AD B2C user by email', error);
      throw error;
    }
  }

  /**
   * Update user
   */
  async updateUser(userId: string, updates: Record<string, any>): Promise<any> {
    try {
      const updateObject: Record<string, any> = {};
      
      // Map common fields
      if (updates.displayName) updateObject.displayName = updates.displayName;
      if (updates.mail) updateObject.mail = updates.mail;
      if (updates.companyId) updateObject.extension_companyId = updates.companyId;
      if (updates.role) updateObject.extension_role = updates.role;
      if (updates.accountEnabled !== undefined) updateObject.accountEnabled = updates.accountEnabled;

      const updatedUser = await this.graphClient.api(`/users/${userId}`).patch(updateObject);

      console.log('Azure AD B2C user updated successfully', {
        userId: updatedUser.id,
        updates: Object.keys(updateObject),
      });

      return updatedUser;
    } catch (error) {
      logError('Failed to update Azure AD B2C user', error);
      throw error;
    }
  }

  /**
   * Delete user
   */
  async deleteUser(userId: string): Promise<void> {
    try {
      await this.graphClient.api(`/users/${userId}`).delete();

      console.log('Azure AD B2C user deleted successfully', { userId });
    } catch (error) {
      logError('Failed to delete Azure AD B2C user', error);
      throw error;
    }
  }

  /**
   * List users with pagination
   */
  async listUsers(page: number = 1, pageSize: number = 10): Promise<{
    users: any[];
    nextToken?: string;
  }> {
    try {
      const skip = (page - 1) * pageSize;
      const response = await this.graphClient
        .api('/users')
        .top(pageSize)
        .skip(skip)
        .get();

      return {
        users: response.value || [],
        nextToken: response['@odata.nextLink'] ? this.extractSkipToken(response['@odata.nextLink']) : undefined,
      };
    } catch (error) {
      logError('Failed to list Azure AD B2C users', error);
      throw error;
    }
  }

  /**
   * Extract skip token from next link
   */
  private extractSkipToken(nextLink: string): string | undefined {
    try {
      const url = new URL(nextLink);
      return url.searchParams.get('$skiptoken') || undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * Search users by query
   */
  async searchUsers(query: string, page: number = 1, pageSize: number = 10): Promise<{
    users: any[];
    nextToken?: string;
  }> {
    try {
      const skip = (page - 1) * pageSize;
      const response = await this.graphClient
        .api('/users')
        .search(query)
        .top(pageSize)
        .skip(skip)
        .get();

      return {
        users: response.value || [],
        nextToken: response['@odata.nextLink'] ? this.extractSkipToken(response['@odata.nextLink']) : undefined,
      };
    } catch (error) {
      logError('Failed to search Azure AD B2C users', error);
      throw error;
    }
  }

  /**
   * Get user roles
   */
  async getUserRoles(userId: string): Promise<string[]> {
    try {
      const memberOf = await this.graphClient.api(`/users/${userId}/memberOf`).get();
      
      return memberOf.value?.map((group: any) => group.displayName) || [];
    } catch (error) {
      logError('Failed to get user roles', error);
      return [];
    }
  }

  /**
   * Assign role to user
   */
  async assignRoleToUser(userId: string, roleId: string): Promise<void> {
    try {
      await this.graphClient.api(`/users/${userId}/memberOf/$ref`).post({
        '@odata.id': `https://graph.microsoft.com/v1.0/directoryObjects/${roleId}`
      });
    } catch (error) {
      logError('Failed to assign role to user', error);
      throw error;
    }
  }

  /**
   * Remove role from user
   */
  async removeRoleFromUser(userId: string, roleId: string): Promise<void> {
    try {
      await this.graphClient.api(`/users/${userId}/memberOf/${roleId}/$ref`).delete();
    } catch (error) {
      logError('Failed to remove role from user', error);
      throw error;
    }
  }

  /**
   * Get user groups
   */
  async getUserGroups(userId: string): Promise<any[]> {
    try {
      const groups = await this.graphClient.api(`/users/${userId}/memberOf`).get();
      return groups.value || [];
    } catch (error) {
      logError('Failed to get user groups', error);
      return [];
    }
  }

  /**
   * Add user to group
   */
  async addUserToGroup(userId: string, groupId: string): Promise<void> {
    try {
      await this.graphClient.api(`/groups/${groupId}/members/$ref`).post({
        '@odata.id': `https://graph.microsoft.com/v1.0/directoryObjects/${userId}`
      });
    } catch (error) {
      logError('Failed to add user to group', error);
      throw error;
    }
  }

  /**
   * Remove user from group
   */
  async removeUserFromGroup(userId: string, groupId: string): Promise<void> {
    try {
      await this.graphClient.api(`/groups/${groupId}/members/${userId}/$ref`).delete();
    } catch (error) {
      logError('Failed to remove user from group', error);
      throw error;
    }
  }

  /**
   * Reset user password
   */
  async resetUserPassword(userId: string, newPassword: string): Promise<void> {
    try {
      await this.graphClient.api(`/users/${userId}`).patch({
        passwordProfile: {
          forceChangePasswordNextSignIn: true,
          password: newPassword,
        }
      });
    } catch (error) {
      logError('Failed to reset user password', error);
      throw error;
    }
  }

  /**
   * Enable/disable user account
   */
  async setUserAccountStatus(userId: string, enabled: boolean): Promise<void> {
    try {
      await this.graphClient.api(`/users/${userId}`).patch({
        accountEnabled: enabled
      });
    } catch (error) {
      logError('Failed to set user account status', error);
      throw error;
    }
  }

  /**
   * Get user sign-in activity
   */
  async getUserSignInActivity(userId: string): Promise<any> {
    try {
      const signIns = await this.graphClient.api(`/auditLogs/signIns`).filter(`userId eq '${userId}'`).get();
      return signIns.value || [];
    } catch (error) {
      logError('Failed to get user sign-in activity', error);
      return [];
    }
  }

  /**
   * Get user risk detection
   */
  async getUserRiskDetection(userId: string): Promise<any[]> {
    try {
      const riskDetections = await this.graphClient.api(`/identityProtection/riskDetections`).filter(`userId eq '${userId}'`).get();
      return riskDetections.value || [];
    } catch (error) {
      logError('Failed to get user risk detection', error);
      return [];
    }
  }
}

// Export singleton instance
export const azureADB2CUserService = new AzureADB2CUserService();
