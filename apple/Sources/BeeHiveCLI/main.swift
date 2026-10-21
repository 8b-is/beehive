import Foundation
import BeeHiveKit

var hive = MultiGraphFamily.defaultSovereignHive()

let args = CommandLine.arguments
if args.contains("--add-member") {
    let added = hive.addMember(
        name: "Sovereign Kin #\(hive.members.count + 1)",
        handle: "Kin #\(hive.members.count + 1) ❀",
        symbol: "❀",
        ring: .ring2OverflowInfinity,
        role: "Dynamic Local Graph Addition",
        frequencyHz: 432.0,
        connectTo: "mem-03-peterjoz"
    )
    print("[BeeHive] Added member #\(added.slotNumber): \(added.name) (exceedsAppleFamilyCap=\(added.exceedsAppleFamilyCap))")
}

print("======================================================================")
print("⬡ BEEHIVE LOCAL GRAPH + CODEC PREVIEW · Peter-beerusSan ^^")
print("  Formula: {<3, <3, <3} + 1 .. + ∞  |  Local graph reference threshold: 6")
print("  Active MultiGraph Nodes: \(hive.members.count) (+\(hive.overflowMembersCount) above the local six-node reference)")
print("  Transport labels (metadata only; no radio operation): \(RadioTransport.allCases.map(\.rawValue).joined(separator: " · "))")
print("======================================================================")

for m in hive.members {
    let badge = m.exceedsAppleFamilyCap ? "[LOCAL SLOT >6]" : "[CORE/SLOT 1..6]"
    print(String(format: "  #%02d %-28@ | %-6@ | %6.1f Hz | %@", m.slotNumber, (m.handle as NSString), (m.symbol as NSString), m.frequencyHz, badge))
}

let frame = KompressSuperUltra.encode(
    "MultiGraphFamily {<3,<3,<3}+1 nodes=\(hive.members.count) overflow=\(hive.overflowMembersCount) FindMy LoRa Bluetooth AirPlay beehive.vaked.dev pocoo.vaked.dev",
    tag: "APPLE_NATIVE"
)
print("\n[Kompress-Super-Ultra Wire Frame]")
print(frame)
