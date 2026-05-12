import Foundation

enum PaymentMethod: String, Codable, CaseIterable {
    case appleWallet = "Apple Wallet"
    case cash = "Efectivo"
    case card = "Tarjeta"
    case transfer = "Transferencia"
    case other = "Otro"

    var icon: String {
        switch self {
        case .appleWallet: return "applelogo"
        case .cash: return "banknote"
        case .card: return "creditcard"
        case .transfer: return "arrow.left.arrow.right"
        case .other: return "ellipsis.circle"
        }
    }
}

enum TransactionCategory: String, Codable, CaseIterable {
    case food = "Comida"
    case transport = "Transporte"
    case entertainment = "Entretenimiento"
    case health = "Salud"
    case shopping = "Compras"
    case services = "Servicios"
    case other = "Otro"

    var icon: String {
        switch self {
        case .food: return "fork.knife"
        case .transport: return "car"
        case .entertainment: return "tv"
        case .health: return "heart"
        case .shopping: return "bag"
        case .services: return "bolt"
        case .other: return "tag"
        }
    }
}

struct Transaction: Identifiable, Codable {
    var id: UUID = UUID()
    var amount: Double
    var description: String
    var date: Date
    var category: TransactionCategory
    var paymentMethod: PaymentMethod
}
