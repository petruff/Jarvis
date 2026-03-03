# How to Connect Mobile (WhatsApp & Telegram)

## 1. Locate the Terminal
Your Electron AAOS backend is running in a terminal window (cmd/powershell).
Find the window running `npm run dev` in `packages/jarvis-backend`.

## 2. Connect WhatsApp 🟩
1.  Look at the terminal output. You should see a **QR Code**.
    *   *If no QR code is visible, save `index.ts` again or restart the backend.*
2.  Open **WhatsApp** on your phone.
3.  Go to **Settings** -> **Linked Devices** -> **Link a Device**.
4.  Scan the QR code in the terminal.
5.  **Success:** The terminal will log `WhatsApp Client is ready!`.

## 3. Connect Telegram ✈️
1.  Open **Telegram** on your phone.
2.  Search for your bot username (the one associated with your token).
    *   *Tip: Check the name you gave @BotFather.*
3.  Tap **Start** or send the command `/start`.
4.  **Success:** Jarvis will reply: "Jarvis Online. Awaiting commands."

## 4. Verify Connection
Send a test message from either app:
> "Jarvis, are you online?"

If Jarvis replies with "Systems functional" (or similar AI response), you are connected!
