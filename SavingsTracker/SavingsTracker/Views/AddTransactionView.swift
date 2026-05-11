import SwiftUI

struct AddTransactionView: View {
    @EnvironmentObject var appData: AppData
    @Environment(\.dismiss) var dismiss

    @State private var amount = ""
    @State private var description = ""
    @State private var selectedCategory: TransactionCategory = .other
    @State private var selectedMethod: PaymentMethod = .appleWallet
    @State private var selectedDate = Date()
    @State private var showingDatePicker = false
    @FocusState private var amountFocused: Bool

    var amountValue: Double { Double(amount) ?? 0 }
    var isValid: Bool { amountValue > 0 && !description.isEmpty }

    var body: some View {
        NavigationView {
            Form {
                amountSection
                detailsSection
                categorySection
                paymentMethodSection
                dateSection
            }
            .navigationTitle("Nuevo Gasto")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancelar") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Guardar") { save() }
                        .bold()
                        .disabled(!isValid)
                }
            }
            .onAppear { amountFocused = true }
        }
    }

    private var amountSection: some View {
        Section {
            HStack {
                Text("$")
                    .font(.title.bold())
                    .foregroundColor(.green)
                TextField("0.00", text: $amount)
                    .font(.system(size: 36, weight: .bold, design: .rounded))
                    .keyboardType(.decimalPad)
                    .focused($amountFocused)
            }
            .padding(.vertical, 8)

            if appData.remainingToday > 0 {
                HStack {
                    Text("Disponible hoy:")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Spacer()
                    Text(appData.remainingToday, format: .currency(code: "MXN"))
                        .font(.caption.bold())
                        .foregroundColor(remainingAfterThisSpend >= 0 ? .green : .red)
                }

                if amountValue > 0 {
                    HStack {
                        Text("Después de este gasto:")
                            .font(.caption)
                            .foregroundColor(.secondary)
                        Spacer()
                        Text(remainingAfterThisSpend, format: .currency(code: "MXN"))
                            .font(.caption.bold())
                            .foregroundColor(remainingAfterThisSpend >= 0 ? .green : .red)
                    }
                }
            }
        } header: {
            Text("Monto")
        }
    }

    private var remainingAfterThisSpend: Double {
        appData.remainingToday - amountValue
    }

    private var detailsSection: some View {
        Section("Descripción") {
            TextField("¿En qué gastaste?", text: $description)
        }
    }

    private var categorySection: some View {
        Section("Categoría") {
            LazyVGrid(columns: [GridItem(.adaptive(minimum: 90))], spacing: 8) {
                ForEach(TransactionCategory.allCases, id: \.self) { cat in
                    CategoryButton(
                        category: cat,
                        isSelected: selectedCategory == cat
                    ) {
                        selectedCategory = cat
                    }
                }
            }
            .padding(.vertical, 4)
        }
    }

    private var paymentMethodSection: some View {
        Section("Método de pago") {
            Picker("Método", selection: $selectedMethod) {
                ForEach(PaymentMethod.allCases, id: \.self) { method in
                    Label(method.rawValue, systemImage: method.icon)
                        .tag(method)
                }
            }
            .pickerStyle(.menu)
        }
    }

    private var dateSection: some View {
        Section("Fecha") {
            DatePicker("Fecha y hora", selection: $selectedDate, displayedComponents: [.date, .hourAndMinute])
                .environment(\.locale, Locale(identifier: "es_MX"))
        }
    }

    private func save() {
        let transaction = Transaction(
            amount: amountValue,
            description: description,
            date: selectedDate,
            category: selectedCategory,
            paymentMethod: selectedMethod
        )
        appData.addTransaction(transaction)
        dismiss()
    }
}

struct CategoryButton: View {
    let category: TransactionCategory
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(spacing: 4) {
                Image(systemName: category.icon)
                    .font(.title3)
                Text(category.rawValue)
                    .font(.caption2)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 10)
            .background(isSelected ? Color.green : Color(.systemGray6))
            .foregroundColor(isSelected ? .white : .primary)
            .cornerRadius(12)
        }
    }
}
