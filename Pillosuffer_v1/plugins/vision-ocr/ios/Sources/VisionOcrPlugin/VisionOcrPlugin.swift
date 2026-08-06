import Foundation
import UIKit
import Capacitor
import Vision

/**
 * 약 봉투 OCR을 온디바이스 Vision 으로 처리한다.
 *
 * 웹에서는 /api/ocr(Google Vision)을 그대로 쓰지만, 앱에서는 처방전 사진이
 * 기기 밖으로 나가지 않는다. Vision 의 한국어 인식은 iOS 16 부터라
 * 배포 타깃이 16.0 이어야 한다.
 */
@objc(VisionOcrPlugin)
public class VisionOcrPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "VisionOcrPlugin"
    public let jsName = "VisionOcr"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "recognize", returnType: CAPPluginReturnPromise)
    ]

    @objc func recognize(_ call: CAPPluginCall) {
        guard let raw = call.getString("image") else {
            call.reject("image(base64) 파라미터가 필요합니다.")
            return
        }

        // data URL(`data:image/jpeg;base64,...`)로 들어와도 받아준다.
        let payload: String
        if let comma = raw.firstIndex(of: ","), raw.hasPrefix("data:") {
            payload = String(raw[raw.index(after: comma)...])
        } else {
            payload = raw
        }

        guard let data = Data(base64Encoded: payload, options: .ignoreUnknownCharacters),
              let image = UIImage(data: data),
              let cgImage = image.cgImage else {
            call.reject("이미지를 디코딩할 수 없습니다.")
            return
        }

        let request = VNRecognizeTextRequest { request, error in
            if let error = error {
                call.reject("텍스트 인식 실패: \(error.localizedDescription)")
                return
            }
            let observations = request.results as? [VNRecognizedTextObservation] ?? []
            let lines = Self.composeLines(from: observations)
            call.resolve([
                "text": lines.joined(separator: "\n"),
                "lineCount": lines.count
            ])
        }

        request.recognitionLevel = .accurate
        // 약품명은 사전에 없는 단어가 많다. 언어 교정을 켜면 "록소닌" 같은 이름이
        // 엉뚱하게 바뀔 수 있어 원문 그대로 받는다.
        request.usesLanguageCorrection = false

        // ko-KR 이 없는 기기/OS 에서는 영문만으로라도 동작하게 한다.
        // recognitionLevel 을 정한 뒤에 물어야 그 레벨에서 지원하는 목록이 나온다.
        let supported = (try? request.supportedRecognitionLanguages()) ?? []
        request.recognitionLanguages = supported.contains("ko-KR") ? ["ko-KR", "en-US"] : ["en-US"]

        DispatchQueue.global(qos: .userInitiated).async {
            do {
                let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
                try handler.perform([request])
            } catch {
                call.reject("Vision 요청 실패: \(error.localizedDescription)")
            }
        }
    }

    /**
     * 관측 결과를 시각적인 "줄"로 복원한다.
     *
     * Vision 은 같은 행이라도 공백이 넓으면 별개 관측으로 쪼갠다. 약 봉투는
     * "약품명 ⎵⎵⎵ 1일 2회" 처럼 넓게 띄어쓰는 경우가 많아서, 그대로 줄바꿈으로
     * 이어 붙이면 약품명만 있는 줄이 생긴다. 그러면 parseDrugs 가 그 줄에서
     * 용법을 못 찾고 전체 텍스트의 첫 매치를 가져와 다른 약의 복용법을 붙인다.
     * (록소닌정 1일 2회 → 타이레놀의 1일 3회로 표시되는 버그)
     *
     * 그래서 세로 위치가 겹치는 관측들을 한 줄로 묶고 x 순으로 정렬한다.
     * boundingBox 는 정규화 좌표이고 원점이 좌하단이다.
     */
    static func composeLines(from observations: [VNRecognizedTextObservation]) -> [String] {
        struct Row {
            var minY: CGFloat
            var maxY: CGFloat
            var items: [(x: CGFloat, text: String)]
        }

        var rows: [Row] = []

        for observation in observations {
            guard let text = observation.topCandidates(1).first?.string else { continue }
            let box = observation.boundingBox
            let centerY = box.midY
            // 같은 행으로 볼 세로 허용 오차. 글자 높이의 절반이면 위아래로 조금
            // 흔들린 텍스트도 같은 줄로 묶인다.
            let tolerance = box.height / 2

            if let index = rows.firstIndex(where: { centerY >= $0.minY - tolerance && centerY <= $0.maxY + tolerance }) {
                rows[index].items.append((x: box.minX, text: text))
                rows[index].minY = min(rows[index].minY, box.minY)
                rows[index].maxY = max(rows[index].maxY, box.maxY)
            } else {
                rows.append(Row(minY: box.minY, maxY: box.maxY, items: [(x: box.minX, text: text)]))
            }
        }

        // 위 → 아래(정규화 y 는 클수록 위쪽), 각 줄은 왼쪽 → 오른쪽.
        return rows
            .sorted { $0.maxY > $1.maxY }
            .map { row in
                row.items
                    .sorted { $0.x < $1.x }
                    .map(\.text)
                    .joined(separator: " ")
            }
    }
}
