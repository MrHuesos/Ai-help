import Foundation
import Combine

enum IncomePeriod: String, Codable, CaseIterable {
    case biweekly = "Quincenal"
    case monthly = "Mensual"

    var days: Double {
        switch self {
        case .biweekly: return 15
        case .monthly: return 30
        }
    }
}

class AppData: ObservableObject {
    @Published var income: Double {
        didSet { save() }
    }
    @Published var incomePeriod: IncomePeriod {
        didSet { save() }
    }
    @Published var transactions: [Transaction] {
        didSet { save() }
    }
    @Published var periodStartDate: Date {
        didSet { save() }
    }

    private let defaults = UserDefaults.standard

    init() {
        self.income = defaults.double(forKey: "income")
        self.incomePeriod = IncomePeriod(rawValue: defaults.string(forKey: "incomePeriod") ?? "") ?? .biweekly
        self.periodStartDate = (defaults.object(forKey: "periodStartDate") as? Date) ?? Date()

        if let data = defaults.data(forKey: "transactions"),
           let decoded = try? JSONDecoder().decode([Transaction].self, from: data) {
            self.transactions = decoded
        } else {
            self.transactions = []
        }
    }

    // MARK: - Computed Budget Properties

    var dailyLimit: Double {
        guard income > 0 else { return 0 }
        return income / incomePeriod.days
    }

    var periodEndDate: Date {
        Calendar.current.date(byAdding: .day, value: Int(incomePeriod.days), to: periodStartDate) ?? periodStartDate
    }

    var daysRemainingInPeriod: Int {
        let today = Calendar.current.startOfDay(for: Date())
        let end = Calendar.current.startOfDay(for: periodEndDate)
        return max(0, Calendar.current.dateComponents([.day], from: today, to: end).day ?? 0)
    }

    var daysElapsedInPeriod: Int {
        let today = Calendar.current.startOfDay(for: Date())
        let start = Calendar.current.startOfDay(for: periodStartDate)
        return max(0, Calendar.current.dateComponents([.day], from: start, to: today).day ?? 0)
    }

    var currentPeriodTransactions: [Transaction] {
        transactions.filter { $0.date >= periodStartDate && $0.date <= periodEndDate }
    }

    var totalSpentThisPeriod: Double {
        currentPeriodTransactions.reduce(0) { $0 + $1.amount }
    }

    var remainingBudget: Double {
        income - totalSpentThisPeriod
    }

    var todayTransactions: [Transaction] {
        let today = Calendar.current.startOfDay(for: Date())
        let tomorrow = Calendar.current.date(byAdding: .day, value: 1, to: today)!
        return transactions.filter { $0.date >= today && $0.date < tomorrow }
    }

    var totalSpentToday: Double {
        todayTransactions.reduce(0) { $0 + $1.amount }
    }

    var remainingToday: Double {
        dailyLimit - totalSpentToday
    }

    // How much can be spent per day from now to end of period
    var adjustedDailyLimit: Double {
        guard daysRemainingInPeriod > 0 else { return 0 }
        return remainingBudget / Double(daysRemainingInPeriod)
    }

    var spentPercentage: Double {
        guard income > 0 else { return 0 }
        return min(1.0, totalSpentThisPeriod / income)
    }

    var todaySpentPercentage: Double {
        guard dailyLimit > 0 else { return 0 }
        return min(1.0, totalSpentToday / dailyLimit)
    }

    // MARK: - Actions

    func addTransaction(_ transaction: Transaction) {
        transactions.insert(transaction, at: 0)
    }

    func deleteTransaction(at offsets: IndexSet) {
        transactions.remove(atOffsets: offsets)
    }

    func deleteTransaction(_ transaction: Transaction) {
        transactions.removeAll { $0.id == transaction.id }
    }

    func startNewPeriod() {
        periodStartDate = Date()
    }

    func spendingByCategory() -> [(TransactionCategory, Double)] {
        var totals: [TransactionCategory: Double] = [:]
        for t in currentPeriodTransactions {
            totals[t.category, default: 0] += t.amount
        }
        return totals.sorted { $0.value > $1.value }
    }

    // MARK: - Persistence

    private func save() {
        defaults.set(income, forKey: "income")
        defaults.set(incomePeriod.rawValue, forKey: "incomePeriod")
        defaults.set(periodStartDate, forKey: "periodStartDate")
        if let data = try? JSONEncoder().encode(transactions) {
            defaults.set(data, forKey: "transactions")
        }
    }
}
