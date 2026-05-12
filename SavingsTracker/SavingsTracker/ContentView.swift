import SwiftUI

struct ContentView: View {
    @EnvironmentObject var appData: AppData
    @State private var selectedTab = 0
    @State private var showAddTransaction = false

    var body: some View {
        TabView(selection: $selectedTab) {
            DashboardView(showAddTransaction: $showAddTransaction)
                .tabItem {
                    Label("Inicio", systemImage: "chart.pie.fill")
                }
                .tag(0)

            TransactionsView(showAddTransaction: $showAddTransaction)
                .tabItem {
                    Label("Gastos", systemImage: "list.bullet.rectangle")
                }
                .tag(1)

            SettingsView()
                .tabItem {
                    Label("Configurar", systemImage: "gearshape.fill")
                }
                .tag(2)
        }
        .sheet(isPresented: $showAddTransaction) {
            AddTransactionView()
        }
        .accentColor(.green)
    }
}
