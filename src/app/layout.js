import './globals.css'

export const metadata = {
  title: 'Agent Emran – AI Project Builder',
  description: 'Build custom AI agents trained on your data',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
