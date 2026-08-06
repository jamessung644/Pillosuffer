require 'json'

package = JSON.parse(File.read(File.join(__dir__, 'package.json')))

# pod 이름은 Capacitor CLI 의 fixName('vision-ocr') 결과와 같아야 한다 → VisionOcr
Pod::Spec.new do |s|
  s.name = 'VisionOcr'
  s.version = package['version']
  s.summary = package['description']
  s.license = package['license']
  s.homepage = 'https://pillosuffer-v1.vercel.app'
  s.author = 'PilloSuffer'
  s.source = { :path => '.' }
  s.source_files = 'ios/Sources/**/*.{swift,h,m}'
  # Vision 의 한국어 텍스트 인식이 iOS 16 부터다.
  s.ios.deployment_target = '16.0'
  s.dependency 'Capacitor'
  s.swift_version = '5.1'
end
