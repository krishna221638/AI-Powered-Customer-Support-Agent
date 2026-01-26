import { FC, useState, useEffect, FormEvent } from "react";
import { useAuthStore } from "../stores/authStore";
import {
  User as UserIcon,
  KeyRound,
  Eye,
  EyeOff,
  Copy,
  AlertTriangle,
  Loader2,
  ShieldCheck,
  Link2,
  Save,
  CheckCircle,
} from "lucide-react";
import {
  getCompanySettings,
  updateCompanyWebhook,
  CompanySettings,
  UpdateCompanyWebhookPayload,
} from "../services/companyService";
import {
  changeUserPassword,
  ChangePasswordRequest,
} from "../services/userService";
import toast from "react-hot-toast";

const ProfilePage: FC = () => {
  const { user } = useAuthStore();

  const [companySettings, setCompanySettings] =
    useState<CompanySettings | null>(null);
  const [isLoadingSettings, setIsLoadingSettings] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [showRawApiKey, setShowRawApiKey] = useState(false);

  const [webhookUrlInput, setWebhookUrlInput] = useState("");
  const [isUpdatingWebhook, setIsUpdatingWebhook] = useState(false);
  const [webhookUpdateError, setWebhookUpdateError] = useState<string | null>(
    null
  );

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [changePasswordError, setChangePasswordError] = useState<string | null>(
    null
  );
  const [changePasswordSuccess, setChangePasswordSuccess] = useState<
    string | null
  >(null);

  useEffect(() => {
    const fetchCompanyDetails = async () => {
      if (!user || (user.role !== "admin" && user.role !== "superAdmin")) {
        setCompanySettings(null);
        setIsLoadingSettings(false);
        return;
      }

      setIsLoadingSettings(true);
      setSettingsError(null);
      try {
        const response = await getCompanySettings();
        setCompanySettings(response);
        setWebhookUrlInput(response.webhook_url || "");
      } catch (error) {
        console.error("Failed to fetch company settings:", error);
        const errorMessage =
          error instanceof Error ? error.message : "An unknown error occurred";
        setSettingsError(errorMessage);
        toast.error(`Failed to load company settings: ${errorMessage}`);
        setCompanySettings(null);
      } finally {
        setIsLoadingSettings(false);
      }
    };

    if (user) {
      fetchCompanyDetails();
    }
  }, [user]);

  const handleCopyApiKey = () => {
    if (companySettings?.api_key) {
      navigator.clipboard
        .writeText(companySettings.api_key)
        .then(() => toast.success("API Key copied to clipboard!"))
        .catch((err) => toast.error("Failed to copy API Key: " + String(err)));
    }
  };

  const handleSaveWebhook = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!companySettings) {
      toast.error("Company settings not loaded.");
      return;
    }

    setIsUpdatingWebhook(true);
    setWebhookUpdateError(null);
    try {
      const payload: UpdateCompanyWebhookPayload = {
        webhook_url:
          webhookUrlInput.trim() === "" ? null : webhookUrlInput.trim(),
      };
      const response = await updateCompanyWebhook(payload);
      setCompanySettings(response);
      setWebhookUrlInput(response.webhook_url || "");
      toast.success("Webhook URL updated successfully!");
    } catch (error) {
      console.error("Failed to update webhook URL:", error);
      const errorMessage =
        error instanceof Error ? error.message : "An unknown error occurred";
      setWebhookUpdateError(errorMessage);
      toast.error(`Failed to update webhook: ${errorMessage}`);
    } finally {
      setIsUpdatingWebhook(false);
    }
  };

  const handleChangePassword = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setChangePasswordError(null);
    setChangePasswordSuccess(null);

    if (newPassword !== confirmNewPassword) {
      setChangePasswordError("New passwords do not match.");
      return;
    }
    if (newPassword.length < 8) {
      setChangePasswordError(
        "New password must be at least 8 characters long."
      );
      return;
    }

    setIsChangingPassword(true);
    try {
      const payload: ChangePasswordRequest = {
        current_password: currentPassword,
        new_password: newPassword,
      };
      const response = await changeUserPassword(payload);
      toast.success("Password changed successfully!");
      setChangePasswordSuccess("Password changed successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (error) {
      console.error("Failed to change password:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "An unknown error occurred while changing password.";
      setChangePasswordError(errorMessage);
      toast.error(`Password change failed: ${errorMessage}`);
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center transition-colors duration-300">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
        <p className="ml-3 text-xl text-gray-700 dark:text-gray-300">Loading user profile...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 transition-colors duration-300">
      <div className="max-w-3xl mx-auto">
        <header className="mb-10">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
            My Profile
          </h1>
        </header>

        {/* User Information Card */}
        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg overflow-hidden mb-8 transition-colors duration-300">
          <div className="bg-primary-600 dark:bg-primary-700 p-4 sm:px-6 transition-colors duration-300">
            <h2 className="text-xl font-semibold text-white flex items-center">
              <UserIcon className="h-6 w-6 mr-3" /> Personal Information
            </h2>
          </div>
          <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-5 sm:p-0 transition-colors duration-300">
            <dl className="sm:divide-y sm:divide-gray-200 dark:sm:divide-gray-700">
              <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Username</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100 sm:mt-0 sm:col-span-2">
                  {user.username}
                </dd>
              </div>
              <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Email address
                </dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100 sm:mt-0 sm:col-span-2">
                  {user.email || "Not provided"}
                </dd>
              </div>
              <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Role</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100 sm:mt-0 sm:col-span-2 capitalize">
                  {user.role}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        {/* API Configuration Card */}
        {(user.role === "admin" || user.role === "superAdmin") && (
          <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg overflow-hidden mb-8 transition-colors duration-300">
            <div className="bg-primary-600 dark:bg-primary-700 p-4 sm:px-6 transition-colors duration-300">
              <h2 className="text-xl font-semibold text-white flex items-center">
                <KeyRound className="h-6 w-6 mr-3" /> API & Webhook
                Configuration
              </h2>
            </div>
            <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-5 sm:px-6 transition-colors duration-300">
              {isLoadingSettings && (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                  <p className="ml-3 text-gray-600 dark:text-gray-400">
                    Loading Company Settings...
                  </p>
                </div>
              )}
              {settingsError && !isLoadingSettings && (
                <div className="my-4 p-4 bg-red-50 border border-red-300 rounded-md flex items-center">
                  <AlertTriangle className="h-6 w-6 text-red-500 mr-3 flex-shrink-0" />
                  <p className="text-sm text-red-700">
                    Error loading settings: {settingsError}
                  </p>
                </div>
              )}
              {!isLoadingSettings && !settingsError && companySettings && (
                <div className="space-y-6">
                  {/* API Key Display */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-1">
                      API Key
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                      Your Company API key is used for external integrations.
                      Keep it confidential.
                    </p>
                    <div className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-700 p-3 rounded-md shadow-sm">
                      <input
                        type={showRawApiKey ? "text" : "password"}
                        readOnly
                        value={companySettings.api_key || ""}
                        className="flex-grow p-2 border border-gray-300 dark:border-gray-600 rounded-l-md focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-gray-50 dark:bg-gray-600 dark:text-gray-100 cursor-default"
                        aria-label="API Key"
                      />
                      <button
                        onClick={() => setShowRawApiKey(!showRawApiKey)}
                        className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 border border-gray-300 dark:border-gray-600 rounded-none bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                        title={showRawApiKey ? "Hide API Key" : "Show API Key"}
                      >
                        {showRawApiKey ? (
                          <EyeOff size={20} />
                        ) : (
                          <Eye size={20} />
                        )}
                      </button>
                      <button
                        onClick={handleCopyApiKey}
                        className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 border border-gray-300 dark:border-gray-600 border-l-0 rounded-r-md bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 flex items-center"
                        title="Copy API Key"
                      >
                        <Copy size={20} className="mr-1" /> Copy
                      </button>
                    </div>
                  </div>

                  {/* Webhook URL Management */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-1">
                      Webhook URL
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                      Configure a URL to receive notifications (e.g., new
                      ticket). Leave blank to disable.
                    </p>
                    <form onSubmit={handleSaveWebhook} className="space-y-3">
                      <div>
                        <label htmlFor="webhookUrlInput" className="sr-only">
                          Webhook URL
                        </label>
                        <input
                          type="url"
                          id="webhookUrlInput"
                          name="webhookUrlInput"
                          value={webhookUrlInput}
                          onChange={(e) => setWebhookUrlInput(e.target.value)}
                          placeholder="https://your-webhook-endpoint.com/notify"
                          className="mt-1 block w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-700 dark:text-gray-100"
                          disabled={isUpdatingWebhook}
                        />
                      </div>
                      {webhookUpdateError && (
                        <div className="mt-1 p-2 bg-red-50 border border-red-200 rounded-md flex items-center">
                          <AlertTriangle className="h-4 w-4 text-red-500 mr-2 flex-shrink-0" />
                          <p className="text-xs text-red-700">
                            {webhookUpdateError}
                          </p>
                        </div>
                      )}
                      <button
                        type="submit"
                        disabled={isUpdatingWebhook || isLoadingSettings}
                        className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isUpdatingWebhook ? (
                          <>
                            <Loader2 className="animate-spin h-5 w-5 mr-2" />{" "}
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="h-5 w-5 mr-2" /> Save Webhook
                          </>
                        )}
                      </button>
                    </form>
                  </div>
                </div>
              )}
              {!isLoadingSettings &&
                !settingsError &&
                !companySettings &&
                (user.role === "admin" || user.role === "superAdmin") && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 p-4 text-center">
                    Company settings are not available or could not be loaded.
                  </p>
                )}
            </div>
          </div>
        )}

        {/* Security Settings Card - Change Password Form */}
        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg overflow-hidden transition-colors duration-300">
          <div className="bg-primary-600 dark:bg-primary-700 p-4 sm:px-6 transition-colors duration-300">
            <h2 className="text-xl font-semibold text-white flex items-center">
              <ShieldCheck className="h-6 w-6 mr-3" /> Security Settings
            </h2>
          </div>
          <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-5 sm:px-6 transition-colors duration-300">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
              Change Password
            </h3>

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label
                  htmlFor="currentPassword"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Current Password
                </label>
                <input
                  type="password"
                  id="currentPassword"
                  name="currentPassword"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  className="mt-1 block w-full sm:max-w-md px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-700 dark:text-gray-100"
                  disabled={isChangingPassword}
                />
              </div>
              <div>
                <label
                  htmlFor="newPassword"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  New Password
                </label>
                <input
                  type="password"
                  id="newPassword"
                  name="newPassword"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                  className="mt-1 block w-full sm:max-w-md px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-700 dark:text-gray-100"
                  disabled={isChangingPassword}
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Minimum 8 characters.
                </p>
              </div>
              <div>
                <label
                  htmlFor="confirmNewPassword"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Confirm New Password
                </label>
                <input
                  type="password"
                  id="confirmNewPassword"
                  name="confirmNewPassword"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  required
                  className="mt-1 block w-full sm:max-w-md px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-700 dark:text-gray-100"
                  disabled={isChangingPassword}
                />
              </div>

              {changePasswordError && (
                <div className="my-2 p-3 bg-red-50 border border-red-200 rounded-md flex items-center">
                  <AlertTriangle className="h-5 w-5 text-red-500 mr-2 flex-shrink-0" />
                  <p className="text-sm text-red-700">{changePasswordError}</p>
                </div>
              )}
              {changePasswordSuccess && (
                <div className="flex items-center p-3 bg-green-50 border border-green-200 rounded-md text-sm text-green-700">
                  <CheckCircle className="h-5 w-5 mr-2 text-green-500" />
                  {changePasswordSuccess}
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isChangingPassword}
                  className="w-full sm:w-auto px-6 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 flex items-center justify-center"
                >
                  {isChangingPassword ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin mr-2" />{" "}
                      Changing...
                    </>
                  ) : (
                    "Change Password"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
