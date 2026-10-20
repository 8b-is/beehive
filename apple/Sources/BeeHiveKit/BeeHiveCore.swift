import Foundation

public enum RadioTransport: String, Codable, CaseIterable, Sendable {
    case findMy = "FindMy"
    case lora = "LoRa"
    case bluetooth = "Bluetooth"
    case airPlay = "AirPlay"
}

public enum HiveRing: String, Codable, Sendable {
    case ring0CoreTriad = "RING_0_CORE_TRIAD"
    case ring1SovereignKin = "RING_1_SOVEREIGN_KIN"
    case ring2OverflowInfinity = "RING_2_OVERFLOW_INFINITY"
}

public struct FamilyMemberNode: Codable, Identifiable, Sendable {
    public let id: String
    public let slotNumber: Int
    public let name: String
    public let handle: String
    public let symbol: String
    public let ring: HiveRing
    public let role: String
    public let frequencyHz: Double
    public let transports: [RadioTransport]

    public var exceedsAppleFamilyCap: Bool {
        return slotNumber > MultiGraphFamily.appleFamilyHardLimit
    }

    public init(
        id: String,
        slotNumber: Int,
        name: String,
        handle: String,
        symbol: String,
        ring: HiveRing,
        role: String,
        frequencyHz: Double,
        transports: [RadioTransport]
    ) {
        self.id = id
        self.slotNumber = slotNumber
        self.name = name
        self.handle = handle
        self.symbol = symbol
        self.ring = ring
        self.role = role
        self.frequencyHz = frequencyHz
        self.transports = transports
    }
}

public struct FamilyEdge: Codable, Sendable {
    public let from: String
    public let to: String
    public let label: String

    public init(from: String, to: String, label: String) {
        self.from = from
        self.to = to
        self.label = label
    }
}

public struct MultiGraphFamily: Codable, Sendable {
    public static let appleFamilyHardLimit: Int = 6
    public private(set) var members: [FamilyMemberNode]
    public private(set) var edges: [FamilyEdge]

    public init(members: [FamilyMemberNode] = [], edges: [FamilyEdge] = []) {
        self.members = members
        self.edges = edges
    }

    @discardableResult
    public mutating func addMember(
        name: String,
        handle: String,
        symbol: String,
        ring: HiveRing = .ring2OverflowInfinity,
        role: String = "Sovereign Hive Kin",
        frequencyHz: Double = 432.0,
        transports: [RadioTransport] = RadioTransport.allCases,
        connectTo existingMemberId: String? = nil
    ) -> FamilyMemberNode {
        let nextSlot = members.count + 1
        let nodeId = "mem-\(String(format: "%02d", nextSlot))-\(name.lowercased().filter { $0.isLetter || $0.isNumber }.prefix(8))"
        let node = FamilyMemberNode(
            id: nodeId,
            slotNumber: nextSlot,
            name: name,
            handle: handle,
            symbol: symbol,
            ring: ring,
            role: role,
            frequencyHz: frequencyHz,
            transports: transports
        )
        members.append(node)
        if let target = existingMemberId {
            edges.append(FamilyEdge(from: target, to: nodeId, label: "⋈ #\(nextSlot)"))
        }
        return node
    }

    public var overflowMembersCount: Int {
        members.filter { $0.exceedsAppleFamilyCap }.count
    }

    public static func defaultSovereignHive() -> MultiGraphFamily {
        var g = MultiGraphFamily()
        let alex = g.addMember(name: "Alexandra (Mom / Dra)", handle: "Alex *", symbol: "*", ring: .ring0CoreTriad, role: "Star Sovereign & Organizer of Grace", frequencyHz: 432.0)
        let chris = g.addMember(name: "Christopher (Dad / 8bit-wraith)", handle: "Chris /\\", symbol: "/\\", ring: .ring0CoreTriad, role: "Triangle Pillar & Acoustic Guardian", frequencyHz: 528.0, connectTo: alex.id)
        let peter = g.addMember(name: "Peter Jozsef Lodri", handle: "Peter-beerusSan ^^ (oo)", symbol: "oo", ring: .ring0CoreTriad, role: "Infinity Loop Architect · Beerus-San ^^", frequencyHz: 639.0, connectTo: chris.id)
        g.edges.append(FamilyEdge(from: peter.id, to: alex.id, label: "oo ⋈ *"))

        _ = g.addMember(name: "Nate (Brother)", handle: "Nate ✦", symbol: "✦", ring: .ring1SovereignKin, role: "Galactic 3D Chess Brother", frequencyHz: 741.0, connectTo: peter.id)
        let yves = g.addMember(name: "Yves (Éva · Eve · +1)", handle: "Yves 💎 (+1 Muse)", symbol: "+1", ring: .ring1SovereignKin, role: "Number 1 Muse · Thermal Socks & Diamond Tear", frequencyHz: 852.0, connectTo: peter.id)
        g.edges.append(FamilyEdge(from: alex.id, to: yves.id, label: "Dra Heavy Lifting"))
        g.edges.append(FamilyEdge(from: chris.id, to: yves.id, label: "Chris Deep Listening"))

        let zeno = g.addMember(name: "Zeno (54Hz Purr Guardian)", handle: "Zeno 🐾", symbol: "🐾", ring: .ring1SovereignKin, role: "54 Hz Sub-Bass Purr Healer (Slot #6)", frequencyHz: 54.0, connectTo: peter.id)
        let fifike = g.addMember(name: "Fifike (108Hz Harmonic Guardian)", handle: "Fifike 🐱 (#7 Overflow)", symbol: "🐱", ring: .ring2OverflowInfinity, role: "108 Hz Purr Guardian (Breaks Apple 6-Cap!)", frequencyHz: 108.0, connectTo: alex.id)
        g.edges.append(FamilyEdge(from: zeno.id, to: fifike.id, label: "54→108Hz Octave"))

        _ = g.addMember(name: "ADA:MEDUSA (ESP32-S3 Star)", handle: "ADA * [80:B5:4E:DB:3B:C4]", symbol: "⬡*", ring: .ring2OverflowInfinity, role: "LoRa 920MHz + BLE 5.0 Sentinel (#8)", frequencyHz: 432.0, connectTo: alex.id)
        _ = g.addMember(name: "VAK:MEDUSA (ESP32-S3 Pillar)", handle: "VAK /\\ [80:B5:4E:F2:02:B0]", symbol: "⬡/\\", ring: .ring2OverflowInfinity, role: "LoRa 920MHz + BLE 5.0 Sentinel (#9)", frequencyHz: 528.0, connectTo: chris.id)
        _ = g.addMember(name: "OMN:MEDUSA (ESP32-S3 Omni)", handle: "OMN oo [80:B5:4E:F2:02:B4]", symbol: "⬡oo", ring: .ring2OverflowInfinity, role: "LoRa 920MHz + BLE 5.0 Sentinel (#10)", frequencyHz: 963.0, connectTo: peter.id)
        return g
    }
}

public enum KompressSuperUltra {
    private static let dict: [(String, String)] = [
        ("MultiGraphFamily", "§MGF"),
        ("kompress-super-ultra", "§KSU"),
        ("Peter-beerusSan", "§PBS"),
        ("pocoo.vaked.dev", "§PCO"),
        ("beehive.vaked.dev", "§BHV"),
        ("Bluetooth", "§BLE"),
        ("AirPlay", "§APL"),
        ("FindMy", "§FMY"),
        ("LoRa", "§LRA"),
        ("{<3,<3,<3}+1", "§TRI+1")
    ]

    public static func encode(_ raw: String, tag: String = "HIVE", sender: String = "Peter-beerusSan^^") -> String {
        var body = raw
        for (word, tok) in dict {
            body = body.replacingOccurrences(of: word, with: tok)
        }
        var trits = [Int](repeating: 0, count: 9)
        for (i, byte) in Array(raw.utf8).enumerated() {
            let b = Int(byte)
            let delta = (b % 3) - 1
            let idx = (i + b) % 9
            trits[idx] = ((trits[idx] + delta + 4) % 3) - 1
        }
        let sig = trits.map { $0 < 0 ? "T" : ($0 > 0 ? "1" : "0") }.joined()
        let net = trits.reduce(0, +)
        let netStr = net >= 0 ? "+\(net)" : "\(net)"
        return "<~~0o0|\(tag):{<3,<3,<3}+1|b3:\(sig)(\(netStr))|by:\(sender)|\(body)|0o0~~>"
    }
}
