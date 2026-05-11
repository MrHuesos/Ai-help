import SwiftUI

struct TransactionsView: View {
    @EnvironmentObject var appData: AppData
    @Binding var showAddTransaction: Bool
    @State private var searchText = ""
    @State private var selectedFilter: TransactionCategory? = nil

    var filteredTransactions: [Transaction] {
        appData.transactions.filter { t in
            let matchesSearch = searchText.isEmpty ||
                t.description.localizedCaseInsensitiveContains(searchText)
            let matchesCategory = selectedFilter == nil || t.category == selectedFilter
            return matchesSearch && matchesCategory
        }
    }

    var groupedTransactions: [(String, [Transaction])] {
        let grouped = Dictionary(grouping: filteredTransactions) { t -> String in
            let formatter = DateFormatter()
            formatter.dateStyle = .medium
            formatter.locale = Locale(identifier: "es_MX")
            return formatter.string(from: t.date)
        }
        return grouped.sorted { a, b in
            guard let dateA = filteredTransactions.first(where: { df(from: $0.date) == a.key })?.date,
                  let dateB = filteredTransactions.first(where: { df(from: $0.date) == b.key })?.date else {
                return false
            }
            return dateA > dateB
        }
    }

    var body: some View {
        NavigationView {
            Group {
                if appData.transactions.isEmpty {
                    emptyState
                } else {
                    transactionList
                }
            }
            .navigationTitle("Gastos")
            .searchable(text: $searchText, prompt: "Buscar gasto...")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button {
                        showAddTransaction = true
                    } label: {
                        Image(systemName: "plus.circle.fill")
                            .font(.title2)
                            .foregroundColor(.green)
                    }
                }
            }
        }
    }

    private var emptyState: some View {
        VStack(spacing: 16) {
            Image(systemName: "tray")
                .font(.system(size: 50))
                .foregroundColor(.secondary)
            Text("Sin gastos registrados")
                .font(.title3)
            Text("Toca + para registrar tu primer gasto")
                .foregroundColor(.secondary)
            Button("Registrar gasto") {
                showAddTransaction = true
            }
            .buttonStyle(.borderedProminent)
            .tint(.green)
        }
    }

    private var categoryFilterBar: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                FilterChip(title: "Todos", isSelected: selectedFilter == nil) {
                    selectedFilter = nil
                }
                ForEach(TransactionCategory.allCases, id: \.self) { cat in
                    FilterChip(title: cat.rawValue, isSelected: selectedFilter == cat) {
                        selectedFilter = selectedFilter == cat ? nil : cat
                    }
                }
            }
            .padding(.horizontal)
        }
        .padding(.vertical, 4)
    }

    private var transactionList: some View {
        List {
            Section {
                categoryFilterBar
                    .listRowInsets(EdgeInsets())
                    .listRowBackground(Color.clear)
            }

            ForEach(groupedTransactions, id: \.0) { dateStr, txns in
                Section {
                    ForEach(txns) { transaction in
                        TransactionRowView(transaction: transaction)
                            .swipeActions(edge: .trailing) {
                                Button(role: .destructive) {
                                    appData.deleteTransaction(transaction)
                                } label: {
                                    Label("Eliminar", systemImage: "trash")
                                }
                            }
                    }
                } header: {
                    let dayTotal = txns.reduce(0) { $0 + $1.amount }
                    HStack {
                        Text(dateStr)
                        Spacer()
                        Text(dayTotal, format: .currency(code: "MXN"))
                            .foregroundColor(.secondary)
                    }
                }
            }
        }
        .listStyle(.insetGrouped)
    }

    private func df(from date: Date) -> String {
        let f = DateFormatter()
        f.dateStyle = .medium
        f.locale = Locale(identifier: "es_MX")
        return f.string(from: date)
    }
}

struct FilterChip: View {
    let title: String
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.caption)
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .background(isSelected ? Color.green : Color(.systemGray5))
                .foregroundColor(isSelected ? .white : .primary)
                .cornerRadius(20)
        }
    }
}

struct TransactionRowView: View {
    let transaction: Transaction

    var body: some View {
        HStack(spacing: 12) {
            ZStack {
                Circle()
                    .fill(Color.green.opacity(0.15))
                    .frame(width: 42, height: 42)
                Image(systemName: transaction.category.icon)
                    .foregroundColor(.green)
            }

            VStack(alignment: .leading, spacing: 2) {
                Text(transaction.description)
                    .font(.subheadline.bold())
                HStack(spacing: 4) {
                    Image(systemName: transaction.paymentMethod.icon)
                        .font(.caption2)
                    Text(transaction.paymentMethod.rawValue)
                        .font(.caption)
                    Text("·")
                        .font(.caption)
                    Text(transaction.category.rawValue)
                        .font(.caption)
                }
                .foregroundColor(.secondary)
            }

            Spacer()

            Text(transaction.amount, format: .currency(code: "MXN"))
                .font(.subheadline.bold())
                .foregroundColor(.red)
        }
        .padding(.vertical, 4)
    }
}
