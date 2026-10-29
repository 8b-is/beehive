import SwiftUI
import BeeHiveKit

@available(macOS 13.0, iOS 16.0, *)
public struct BeeHiveDashboardView: View {
    @State private var hive = MultiGraphFamily.defaultSovereignHive()
    @State private var newMemberName: String = ""
    @State private var newMemberSymbol: String = "❀"
    @State private var lastKompressFrame: String = ""

    public init() {}

    public var body: some View {
        NavigationStack {
            List {
                Section("MultiGraphFamily · Local Graph Preview") {
                    HStack {
                        Text("Active Nodes: \(hive.members.count)")
                            .font(.headline)
                        Spacer()
                        Text("+\(hive.overflowMembersCount) above local six-node reference")
                            .font(.caption.monospaced())
                            .foregroundStyle(.pink)
                    }
                    HStack {
                        TextField("Add Member Name (#\(hive.members.count + 1))", text: $newMemberName)
                        Button("+ Add (∞)") {
                            let name = newMemberName.isEmpty ? "Sovereign Kin #\(hive.members.count + 1)" : newMemberName
                            let node = hive.addMember(
                                name: name,
                                handle: "\(name) \(newMemberSymbol)",
                                symbol: newMemberSymbol,
                                ring: .ring2OverflowInfinity,
                                role: "Dynamic MultiGraph Kin",
                                frequencyHz: 432.0,
                                connectTo: hive.members.first?.id
                            )
                            lastKompressFrame = KompressSuperUltra.encode("Added #\(node.slotNumber) \(node.name)", tag: "MGF_ADD")
                            newMemberName = ""
                        }
                    }
                }

                Section("Demo Nodes · Transport Metadata") {
                    ForEach(hive.members) { m in
                        VStack(alignment: .leading, spacing: 4) {
                            HStack {
                                Text("#\(m.slotNumber) \(m.handle)")
                                    .font(.system(.body, design: .monospaced).bold())
                                Spacer()
                                if m.exceedsAppleFamilyCap {
                                    Text("LOCAL SLOT >6")
                                        .font(.caption2.monospaced())
                                        .padding(.horizontal, 6)
                                        .padding(.vertical, 2)
                                        .background(Color.pink.opacity(0.2))
                                        .clipShape(Capsule())
                                }
                            }
                            Text("\(m.name) · \(m.role) · \(Int(m.frequencyHz)) Hz")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }
                }

                if !lastKompressFrame.isEmpty {
                    Section("<~~0o0 kompress-super-ultra Frame") {
                        Text(lastKompressFrame)
                            .font(.caption2.monospaced())
                    }
                }
            }
            .navigationTitle("BeeHive · 8b-is")
        }
    }
}
