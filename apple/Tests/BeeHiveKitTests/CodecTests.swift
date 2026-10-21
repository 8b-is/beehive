import Foundation
import XCTest
@testable import BeeHiveKit

final class CodecTests: XCTestCase {
    struct Vector: Decodable { let raw: String; let tag: String; let sender: String; let frame: String }
    func testSharedVectors() throws {
        var root = URL(fileURLWithPath: #filePath)
        for _ in 0..<4 { root.deleteLastPathComponent() }
        let data = try Data(contentsOf: root.appendingPathComponent("test/codec-vectors.json"))
        let vectors = try JSONDecoder().decode([Vector].self, from: data)
        for v in vectors {
            let frame = KompressSuperUltra.encode(v.raw, tag: v.tag, sender: v.sender)
            XCTAssertEqual(Array(frame.utf8), Array(v.frame.utf8))
            let result = try XCTUnwrap(KompressSuperUltra.decode(v.frame), "Vector: \(v.raw.debugDescription)")
            XCTAssertEqual(Array(result.restored.utf8), Array(v.raw.utf8))
            XCTAssertEqual(result.tag, v.tag)
            XCTAssertEqual(result.sender, v.sender)
            XCTAssertFalse(result.authenticated)
        }
    }
    func testCorruptionAndLegacyAreRejected() {
        let frame = KompressSuperUltra.encode("hello integrity", tag: "TEST", sender: "sender")
        let bytes = Array(frame.utf8)
        for i in bytes.indices {
            var changed = bytes
            changed[i] = bytes[i] == 120 ? 121 : 120
            XCTAssertNil(KompressSuperUltra.decode(String(decoding: changed, as: UTF8.self)))
        }
        XCTAssertNil(KompressSuperUltra.decode(frame + "\n"))
        XCTAssertNil(KompressSuperUltra.decode("<~~0o0|TEST:{<3,<3,<3}+1|b3:000000000(+0)|by:sender|legacy|0o0~~>"))
    }
}
