import SwiftUI

struct DashboardView: View {
    @EnvironmentObject var appData: AppData
    @Binding var showAddTransaction: Bool

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 16) {
                    if appData.income == 0 {
                        noIncomePrompt
                    } else {
                        periodCard
                        dailyCard
                        spendingRingsCard
                        if !appData.todayTransactions.isEmpty {
                            todaySection
                        }
                        categoryBreakdown
                    }
                }
                .padding()
            }
            .background(Color(.systemGroupedBackground))
            .navigationTitle("Mi Presupuesto")
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

    // MARK: - Subviews

    private var noIncomePrompt: some View {
        VStack(spacing: 20) {
            Image(systemName: "banknote")
                .font(.system(size: 60))
                .foregroundColor(.green)
            Text("Configura tu ingreso")
                .font(.title2.bold())
            Text("Ve a la pestaña Configurar para ingresar tu sueldo quincenal o mensual.")
                .multilineTextAlignment(.center)
                .foregroundColor(.secondary)
        }
        .padding(40)
    }

    private var periodCard: some View {
        VStack(spacing: 12) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Periodo \(appData.incomePeriod.rawValue)")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Text(appData.remainingBudget, format: .currency(code: "MXN"))
                        .font(.system(size: 36, weight: .bold, design: .rounded))
                        .foregroundColor(appData.remainingBudget >= 0 ? .primary : .red)
                    Text("disponible de \(appData.income, format: .currency(code: "MXN"))")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
                Spacer()
                CircularProgressView(progress: appData.spentPercentage, color: progressColor(appData.spentPercentage))
                    .frame(width: 70, height: 70)
            }

            ProgressView(value: appData.spentPercentage)
                .tint(progressColor(appData.spentPercentage))

            HStack {
                Label("\(appData.daysElapsedInPeriod) días transcurridos", systemImage: "calendar")
                    .font(.caption)
                    .foregroundColor(.secondary)
                Spacer()
                Label("\(appData.daysRemainingInPeriod) días restantes", systemImage: "clock")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
        .padding()
        .background(Color(.secondarySystemGroupedBackground))
        .cornerRadius(16)
    }

    private var dailyCard: some View {
        HStack(spacing: 12) {
            dailyStatTile(
                title: "Límite diario base",
                amount: appData.dailyLimit,
                icon: "calendar.badge.clock",
                color: .blue
            )
            dailyStatTile(
                title: "Límite ajustado hoy",
                amount: appData.adjustedDailyLimit,
                icon: "chart.line.uptrend.xyaxis",
                color: .orange
            )
        }
    }

    private func dailyStatTile(title: String, amount: Double, icon: String, color: Color) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: icon)
                    .foregroundColor(color)
                Text(title)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            Text(amount, format: .currency(code: "MXN"))
                .font(.title3.bold())
                .minimumScaleFactor(0.7)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(Color(.secondarySystemGroupedBackground))
        .cornerRadius(16)
    }

    private var spendingRingsCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Gasto de hoy")
                .font(.headline)

            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(appData.totalSpentToday, format: .currency(code: "MXN"))
                        .font(.title2.bold())
                        .foregroundColor(appData.remainingToday >= 0 ? .primary : .red)
                    Text("gastado hoy")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Text(max(0, appData.remainingToday), format: .currency(code: "MXN"))
                        .font(.subheadline.bold())
                        .foregroundColor(.green)
                    Text("restante hoy")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                Spacer()
                CircularProgressView(progress: appData.todaySpentPercentage, color: progressColor(appData.todaySpentPercentage))
                    .frame(width: 80, height: 80)
            }

            ProgressView(value: appData.todaySpentPercentage)
                .tint(progressColor(appData.todaySpentPercentage))
        }
        .padding()
        .background(Color(.secondarySystemGroupedBackground))
        .cornerRadius(16)
    }

    private var todaySection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Gastos de hoy")
                .font(.headline)
                .padding(.horizontal)

            ForEach(appData.todayTransactions) { transaction in
                TransactionRowView(transaction: transaction)
            }
        }
    }

    private var categoryBreakdown: some View {
        let breakdown = appData.spendingByCategory()
        guard !breakdown.isEmpty else { return AnyView(EmptyView()) }

        return AnyView(
            VStack(alignment: .leading, spacing: 12) {
                Text("Por categoría (este periodo)")
                    .font(.headline)

                ForEach(breakdown, id: \.0) { category, amount in
                    HStack {
                        Image(systemName: category.icon)
                            .frame(width: 28)
                            .foregroundColor(.green)
                        Text(category.rawValue)
                            .font(.subheadline)
                        Spacer()
                        Text(amount, format: .currency(code: "MXN"))
                            .font(.subheadline.bold())
                    }
                }
            }
            .padding()
            .background(Color(.secondarySystemGroupedBackground))
            .cornerRadius(16)
        )
    }

    private func progressColor(_ progress: Double) -> Color {
        if progress < 0.6 { return .green }
        if progress < 0.85 { return .orange }
        return .red
    }
}

struct CircularProgressView: View {
    let progress: Double
    let color: Color

    var body: some View {
        ZStack {
            Circle()
                .stroke(color.opacity(0.2), lineWidth: 8)
            Circle()
                .trim(from: 0, to: progress)
                .stroke(color, style: StrokeStyle(lineWidth: 8, lineCap: .round))
                .rotationEffect(.degrees(-90))
                .animation(.easeInOut, value: progress)
            Text("\(Int(progress * 100))%")
                .font(.caption.bold())
        }
    }
}
