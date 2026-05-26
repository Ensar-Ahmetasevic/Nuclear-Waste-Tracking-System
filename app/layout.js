import { Rubik } from "next/font/google";
import "./globals.css";

import Providers from "./providers";

import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Navbar from "./../components/navbar/navbar";

const rubik = Rubik({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-rubik",
});

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: "#1d232a",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${rubik.variable} scroll-smooth`}>
      <body className="overflow-x-hidden font-rubik">
        <Providers>
          <ToastContainer
            position="top-center"
            autoClose={4000}
            showProgressBar={true}
            newestOnTop={true}
            closeOnClick={true}
            rtl={false}
            closeButton={true}
            pauseOnFocusLoss={false}
            draggable={false}
            pauseOnHover
            className="mt-16 max-w-[95vw] text-center sm:max-w-md"
            toastClassName="bg-gray-900 text-white"
            bodyClassName="text-sm"
          />
          <Navbar />
          {children}
        </Providers>
      </body>
    </html>
  );
}
