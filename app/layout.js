import { JetBrains_Mono, Rubik } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";

import Providers from "./providers";

import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { LOCALE_COOKIE, THEME_COOKIE, pickLocale, pickTheme } from "../lib/i18n";
import { messagesFor } from "../lib/locales";

const rubik = Rubik({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-rubik-face",
});
const mono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono-face",
});

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: "#0a1422",
};

// Language and theme come from cookies so the first paint already matches them.
export default async function RootLayout({ children }) {
  const store = await cookies();
  const locale = pickLocale(store.get(LOCALE_COOKIE)?.value);
  const theme = pickTheme(store.get(THEME_COOKIE)?.value);
  return (
    <html
      lang={locale}
      data-theme={theme}
      data-scroll-behavior="smooth"
      className={`${rubik.variable} ${mono.variable} scroll-smooth`}
    >
      <body className="overflow-x-clip font-rubik">
        <Providers locale={locale} messages={messagesFor(locale)} theme={theme}>
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
          />
          {children}
        </Providers>
      </body>
    </html>
  );
}
