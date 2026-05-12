import SwiftUI

struct SettingsView: View {
    @EnvironmentObject var appData: AppData
    @State private var incomeText = ""
    @State private var selectedPeriod: IncomePeriod = .biweekly
    @State private var showNewPeriodAlert = false
    @State private var showShortcutsInfo = false

    var body: some View {
        NavigationView {
            Form {
                incomeSection
                periodDatesSection
                shortcutsSection
                dangerSection
            }
            .navigationTitle("Configuración")
            .onAppear {
                incomeText = appData.income > 0 ? String(format: "%.2f", appData.income) : ""
                selectedPeriod = appData.incomePeriod
            }
            .alert("¿Iniciar nuevo periodo?", isPresented: $showNewPeriodAlert) {
                Button("Cancelar", role: .cancel) {}
                Button("Sí, iniciar", role: .destructive) {
                    appData.startNewPeriod()
                }
            } message: {
                Text("Esto reiniciará el periodo actual. Los gastos anteriores se conservan en el historial.")
            }
            .sheet(isPresented: $showShortcutsInfo) {
                ShortcutsInfoView()
            }
        }
    }

    private var incomeSection: some View {
        Section {
            HStack {
                Text("$")
                    .foregroundColor(.green)
                    .font(.headline)
                TextField("0.00", text: $incomeText)
                    .keyboardType(.decimalPad)
                    .onChange(of: incomeText) { val in
                        if let v = Double(val) {
                            appData.income = v
                        }
                    }
            }

            Picker("Periodo", selection: $selectedPeriod) {
                ForEach(IncomePeriod.allCases, id: \.self) { period in
                    Text(period.rawValue).tag(period)
                }
            }
            .onChange(of: selectedPeriod) { val in
                appData.incomePeriod = val
            }

            if appData.income > 0 {
                summaryRow("Límite diario", value: appData.dailyLimit)
                summaryRow("Límite por hora", value: appData.dailyLimit / 24)
            }
        } header: {
            Text("Mis ingresos")
        } footer: {
            Text("Ingresa tu sueldo \(selectedPeriod == .biweekly ? "quincenal" : "mensual") en pesos mexicanos.")
        }
    }

    private var periodDatesSection: some View {
        Section("Periodo actual") {
            dateRow("Inicio", date: appData.periodStartDate)
            dateRow("Fin estimado", date: appData.periodEndDate)

            HStack {
                Text("Días restantes")
                Spacer()
                Text("\(appData.daysRemainingInPeriod) días")
                    .foregroundColor(.secondary)
            }

            Button {
                showNewPeriodAlert = true
            } label: {
                Label("Iniciar nuevo periodo ahora", systemImage: "arrow.clockwise")
            }
            .foregroundColor(.orange)
        }
    }

    private var shortcutsSection: some View {
        Section {
            Button {
                showShortcutsInfo = true
            } label: {
                HStack {
                    Image(systemName: "applescript")
                        .foregroundColor(.purple)
                    VStack(alignment: .leading) {
                        Text("Automatizar con Atajos (Shortcuts)")
                            .foregroundColor(.primary)
                        Text("Registra pagos de Apple Pay automáticamente")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    Spacer()
                    Image(systemName: "chevron.right")
                        .foregroundColor(.secondary)
                        .font(.caption)
                }
            }

            HStack {
                Text("URL Scheme")
                    .foregroundColor(.secondary)
                    .font(.caption)
                Spacer()
                Text("savingstracker://add")
                    .font(.caption.monospaced())
                    .foregroundColor(.secondary)
            }
        } header: {
            Text("Apple Wallet / Atajos")
        } footer: {
            Text("Usa la app Atajos de iOS para registrar automáticamente pagos de Apple Pay.")
        }
    }

    private var dangerSection: some View {
        Section("Datos") {
            Button(role: .destructive) {
                appData.transactions.removeAll()
            } label: {
                Label("Borrar todos los gastos", systemImage: "trash")
            }
        }
    }

    private func summaryRow(_ label: String, value: Double) -> some View {
        HStack {
            Text(label)
                .foregroundColor(.secondary)
            Spacer()
            Text(value, format: .currency(code: "MXN"))
                .bold()
                .foregroundColor(.green)
        }
    }

    private func dateRow(_ label: String, date: Date) -> some View {
        HStack {
            Text(label)
            Spacer()
            Text(date, format: .dateTime.day().month(.wide).year())
                .foregroundColor(.secondary)
        }
    }
}

struct ShortcutsInfoView: View {
    @Environment(\.dismiss) var dismiss

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    VStack(alignment: .leading, spacing: 8) {
                        Label("¿Cómo funciona?", systemImage: "questionmark.circle.fill")
                            .font(.headline)
                        Text("Cuando haces un pago con Apple Pay, iOS puede disparar un Atajo automáticamente. Ese atajo llama a esta app con el monto para registrarlo.")
                            .foregroundColor(.secondary)
                    }

                    Divider()

                    VStack(alignment: .leading, spacing: 12) {
                        Label("Pasos para configurar", systemImage: "list.number")
                            .font(.headline)

                        stepView(number: "1", text: "Abre la app **Atajos** en tu iPhone")
                        stepView(number: "2", text: "Ve a la pestaña **Automatización**")
                        stepView(number: "3", text: "Crea nueva automatización → **Transacción Apple Pay**")
                        stepView(number: "4", text: "Agrega la acción **Abrir URL** con:")
                        codeBox("savingstracker://add?amount=[Monto]&desc=[Nombre del comercio]")
                        stepView(number: "5", text: "Activa la automatización. ¡Listo!")
                    }

                    Divider()

                    VStack(alignment: .leading, spacing: 8) {
                        Label("También puedes registrar manualmente", systemImage: "plus.circle")
                            .font(.headline)
                        Text("Toca el botón + en cualquier pantalla para registrar un gasto al instante.")
                            .foregroundColor(.secondary)
                    }
                }
                .padding()
            }
            .navigationTitle("Integración con Apple Pay")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Listo") { dismiss() }
                }
            }
        }
    }

    private func stepView(number: String, text: LocalizedStringKey) -> some View {
        HStack(alignment: .top, spacing: 12) {
            Text(number)
                .font(.caption.bold())
                .frame(width: 24, height: 24)
                .background(Color.green)
                .foregroundColor(.white)
                .clipShape(Circle())
            Text(text)
                .fixedSize(horizontal: false, vertical: true)
        }
    }

    private func codeBox(_ text: String) -> some View {
        Text(text)
            .font(.caption.monospaced())
            .padding(10)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Color(.systemGray6))
            .cornerRadius(8)
    }
}
