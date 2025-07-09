import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogIn } from "lucide-react";
import { useNavigate } from "react-router-dom";

const LoginPage = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  // Check if user is already logged in
  useEffect(() => {
    const user = localStorage.getItem("user");
    if (user) {
      try {
        const userData = JSON.parse(user);
        if (userData.loggedIn) {
          navigate("/home", { replace: true });
        }
      } catch (error) {
        console.error("Error parsing user data:", error);
        localStorage.removeItem("user");
      }
    }
  }, [navigate]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Get saved password or use default
    const savedPassword = localStorage.getItem("gymPassword") || "ADMIN";
    const savedUser = JSON.parse(
      localStorage.getItem("gymUserSettings") || "{}",
    );
    const savedUsername = savedUser.username || "ADMIN";

    // Check credentials
    if (username === savedUsername && password === savedPassword) {
      // Store login info
      const userData = {
        loggedIn: true,
        userInfo: {
          username: "ADMIN",
          name: "Administrator",
          role: "admin",
        },
        loginTime: new Date().toISOString(),
      };

      localStorage.setItem("user", JSON.stringify(userData));
      localStorage.setItem("loginSuccess", "true");

      // Navigate to home page
      navigate("/home", { replace: true });
    } else {
      setError("اسم المستخدم أو كلمة المرور غير صحيحة");
    }
  };

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center bg-cover bg-center relative overflow-hidden"
      style={{
        backgroundImage:
          "url('https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1200&q=80')",
      }}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-bluegray-900/90 to-bluegray-800/90 backdrop-blur-sm"></div>

      {/* Content */}
      <div className="container relative z-10 px-4 py-10 mx-auto flex flex-col items-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <div className="flex flex-col items-center">
              <img
                src="/yacin-gym-logo.png"
                alt="Yacin Gym Logo"
                className="h-24 w-24 rounded-full shadow-lg border-2 border-yellow-300 object-cover"
              />
              <h1 className="text-4xl font-bold text-center mt-4 mb-8 bg-gradient-to-r from-yellow-300 to-yellow-600 bg-clip-text text-transparent">
                Yacin Gym
              </h1>
            </div>
          </div>

          <Card className="bg-bluegray-800/80 backdrop-blur-xl border-bluegray-700 shadow-xl">
            <div className="p-6 space-y-6">
              <div className="text-center">
                <h2 className="text-xl font-semibold text-white mb-2">
                  تسجيل الدخول
                </h2>
                <p className="text-gray-300 text-sm mb-6">
                  أدخل اسم المستخدم وكلمة المرور
                </p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-white">
                    اسم المستخدم
                  </Label>
                  <Input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="bg-bluegray-700 border-bluegray-600 text-white placeholder-gray-400"
                    placeholder="أدخل اسم المستخدم"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-white">
                    كلمة المرور
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-bluegray-700 border-bluegray-600 text-white placeholder-gray-400"
                    placeholder="أدخل كلمة المرور"
                    required
                  />
                </div>

                {error && (
                  <div className="text-red-400 text-sm text-center">
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-semibold"
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  تسجيل الدخول
                </Button>
              </form>

              <div className="text-center text-xs text-gray-400 mt-4">
                بالضغط على تسجيل الدخول، فإنك توافق على شروط الاستخدام
              </div>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Animated Blobs */}
      <motion.div
        className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-blue-500/10 blur-3xl"
        animate={{
          x: [0, 10, 0],
          y: [0, 15, 0],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          repeatType: "reverse",
        }}
      />
      <motion.div
        className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-purple-500/10 blur-3xl"
        animate={{
          x: [0, -20, 0],
          y: [0, -10, 0],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          repeatType: "reverse",
        }}
      />
    </div>
  );
};

export default LoginPage;
