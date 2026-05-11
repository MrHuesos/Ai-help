import SwiftUI

@main
struct SavingsTrackerApp: App {
    @StateObject private var appData = AppData()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(appData)
                .onOpenURL { url in
                    handleShortcutURL(url)
                }
        }
    }

    // Handle apple-pay://add?amount=XX&desc=YY from Shortcuts automation
    private func handleShortcutURL(_ url: URL) {
        guard url.scheme == "savingstracker",
              url.host == "add",
              let components = URLComponents(url: url, resolvingAgainstBaseURL: false),
              let amountStr = components.queryItems?.first(where: { $0.name == "amount" })?.value,
              let amount = Double(amountStr) else { return }

        let desc = components.queryItems?.first(where: { $0.name == "desc" })?.value ?? "Apple Pay"
        let transaction = Transaction(
            amount: amount,
            description: desc,
            date: Date(),
            category: .other,
            paymentMethod: .appleWallet
        )
        appData.addTransaction(transaction)
    }
}
