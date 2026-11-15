
import { useEffect, useRef, useState } from "react";
import {
  UserRound,
  Mail,
  Camera,
  Save,
  LoaderCircle,
  ShieldCheck,
  CalendarDays,
  Upload,
  CheckCircle2,
} from "lucide-react";

import { useAuth } from "../context/AuthContext";
import api from "../services/api";

// Safely extract backend error messages.
function getErrorMessage(error, fallback) {
  const detail = error.response?.data?.detail;

  if (typeof detail === "string") {
    return detail;
  }

  if (Array.isArray(detail)) {
    return detail
      .map((item) =>
        typeof item === "string"
          ? item
          : item?.msg || "Validation error"
      )
      .join(", ");
  }

  if (typeof detail === "object" && detail !== null) {
    return detail.msg || fallback;
  }

  return fallback;
}

export default function Profile() {
  const { user, updateUser } = useAuth();
  const fileInputRef = useRef(null);

  const [fullName, setFullName] = useState(user?.full_name || "");
  const [email, setEmail] = useState(user?.email || "");

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [preview, setPreview] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setFullName(user?.full_name || "");
    setEmail(user?.email || "");
  }, [user]);

  // Generate complete profile image URL.
  const getImageUrl = (path) => {
    if (!path) return null;

    if (path.startsWith("http")) return path;

    const baseURL = api.defaults.baseURL.replace(/\/+$/, "");

    return `${baseURL}${path}`;
  };

  const profileImage =
    preview || getImageUrl(user?.profile_image_url);

  // Update profile information.
  const handleProfileUpdate = async (e) => {
    e.preventDefault();

    setSaving(true);
    setMessage("");
    setError("");

    try {
      const response = await api.patch("/api/auth/me", {
        full_name: fullName.trim(),
        email: email.trim(),
      });

      updateUser(response.data);

      setMessage("Profile updated successfully!");
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          "Unable to update profile."
        )
      );
    } finally {
      setSaving(false);
    }
  };

  // Upload profile image.
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      setError("Please select a JPG, PNG or WebP image.");
      e.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Image size must not exceed 5 MB.");
      e.target.value = "";
      return;
    }

    setUploading(true);
    setMessage("");
    setError("");

    const localPreview = URL.createObjectURL(file);

    setPreview(localPreview);

    try {
      const formData = new FormData();

      formData.append("file", file);

      const response = await api.post(
        "/api/auth/me/profile-image",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      // Update authenticated user throughout the application.
      updateUser(response.data);

      setPreview(null);

      setMessage("Profile picture updated successfully!");

    } catch (err) {
      setPreview(null);

      setError(
        getErrorMessage(
          err,
          "Unable to upload profile picture."
        )
      );

    } finally {
      URL.revokeObjectURL(localPreview);

      setUploading(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-5xl">

        {/* Page Heading */}
        <div className="mb-7">
          <p className="mb-2 text-sm font-semibold text-emerald-600">
            ACCOUNT SETTINGS
          </p>

          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            My Profile
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Manage your personal information and account settings.
          </p>
        </div>

        {/* Success Message */}
        {message && (
          <div className="mb-5 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-700">
            <CheckCircle2 size={19} />
            {message}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

          {/* Profile Photo Card */}
          <div className="h-fit rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

            <div className="mb-5">
              <h2 className="text-lg font-bold text-slate-900">
                Profile Picture
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Your account identification photo.
              </p>
            </div>

            <div className="flex flex-col items-center">

              <div className="relative mb-5">

                {profileImage ? (
                  <img
                    src={profileImage}
                    alt="Profile"
                    className="h-32 w-32 rounded-full border-4 border-emerald-100 object-cover shadow-sm"
                  />
                ) : (
                  <div className="flex h-32 w-32 items-center justify-center rounded-full border-4 border-emerald-100 bg-emerald-50 text-emerald-700">
                    <UserRound size={52} />
                  </div>
                )}

                <button
                  type="button"
                  onClick={() =>
                    fileInputRef.current?.click()
                  }
                  disabled={uploading}
                  className="absolute bottom-1 right-1 flex h-10 w-10 items-center justify-center rounded-full border-4 border-white bg-emerald-600 text-white shadow-md transition hover:bg-emerald-700 disabled:opacity-60"
                  title="Change profile picture"
                >
                  {uploading ? (
                    <LoaderCircle
                      size={18}
                      className="animate-spin"
                    />
                  ) : (
                    <Camera size={18} />
                  )}
                </button>

              </div>

              <h3 className="text-lg font-bold text-slate-900">
                {user?.full_name}
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Store Administrator
              </p>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleImageUpload}
                className="hidden"
              />

              <button
                type="button"
                onClick={() =>
                  fileInputRef.current?.click()
                }
                disabled={uploading}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-60"
              >
                {uploading ? (
                  <LoaderCircle
                    size={17}
                    className="animate-spin"
                  />
                ) : (
                  <Upload size={17} />
                )}

                {uploading ? "Uploading..." : "Upload New Photo"}
              </button>

              <p className="mt-3 text-center text-xs text-slate-400">
                JPG, PNG or WebP · Maximum 5 MB
              </p>

            </div>
          </div>

          {/* Personal Information */}
          <div className="lg:col-span-2">

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">

              <div className="mb-7">
                <h2 className="text-lg font-bold text-slate-900">
                  Personal Information
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Update your account details below.
                </p>
              </div>

              <form
                onSubmit={handleProfileUpdate}
                className="space-y-6"
              >

                {/* Full Name */}
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Full Name
                  </label>

                  <div className="relative">
                    <UserRound
                      size={19}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) =>
                        setFullName(e.target.value)
                      }
                      required
                      minLength={2}
                      maxLength={100}
                      placeholder="Enter your full name"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-12 pr-4 text-sm text-slate-800 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-50"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Email Address
                  </label>

                  <div className="relative">
                    <Mail
                      size={19}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                      type="email"
                      value={email}
                      onChange={(e) =>
                        setEmail(e.target.value)
                      }
                      required
                      placeholder="Enter your email"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-12 pr-4 text-sm text-slate-800 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-50"
                    />
                  </div>
                </div>

                {/* Account Status */}
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Account Status
                  </label>

                  <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">

                    <ShieldCheck
                      className="text-emerald-600"
                      size={21}
                    />

                    <div>
                      <p className="text-sm font-semibold text-slate-800">
                        {user?.is_active
                          ? "Active Account"
                          : "Inactive Account"}
                      </p>

                      <p className="text-xs text-slate-500">
                        Current account status
                      </p>
                    </div>

                  </div>
                </div>

                {/* Account Created */}
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Account Created
                  </label>

                  <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">

                    <CalendarDays
                      className="text-slate-500"
                      size={21}
                    />

                    <p className="text-sm font-medium text-slate-700">
                      {user?.created_at
                        ? new Date(
                            user.created_at
                          ).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "long",
                            year: "numeric",
                          })
                        : "Not available"}
                    </p>

                  </div>
                </div>

                {/* Save Button */}
                <div className="flex justify-end border-t border-slate-100 pt-5">

                  <button
                    type="submit"
                    disabled={saving || uploading}
                    className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? (
                      <LoaderCircle
                        size={18}
                        className="animate-spin"
                      />
                    ) : (
                      <Save size={18} />
                    )}

                    {saving
                      ? "Saving Changes..."
                      : "Save Changes"}
                  </button>

                </div>

              </form>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
