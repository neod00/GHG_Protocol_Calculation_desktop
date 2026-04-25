import type { LicenseVerificationResult } from "./licenseClient";

export interface LicenseGate {
  canUseCoreFeatures: boolean;
  canCreateProject: boolean;
  canGenerateReport: boolean;
  canEditEmissionFactors: boolean;
  reasonText: string;
}

const lockedGate = (reasonText: string): LicenseGate => ({
  canUseCoreFeatures: false,
  canCreateProject: false,
  canGenerateReport: false,
  canEditEmissionFactors: false,
  reasonText
});

export function buildLicenseGate(result: LicenseVerificationResult | null): LicenseGate {
  if (!result) {
    return lockedGate("라이선스 인증 후 사용할 수 있습니다.");
  }

  if (result.forceUpdate) {
    return lockedGate("필수 업데이트가 필요합니다.");
  }

  if (!result.ok) {
    const reasonTextByReason: Record<string, string> = {
      blocked: "라이선스가 차단되었습니다.",
      expired: "라이선스가 만료되었습니다.",
      device_limit_exceeded: "허용된 기기 수를 초과했습니다.",
      license_not_found: "등록되지 않은 라이선스 키입니다.",
      network_error: "라이선스 서버에 연결할 수 없습니다."
    };

    return lockedGate(reasonTextByReason[result.reason] ?? "라이선스 상태를 확인해야 합니다.");
  }

  return {
    canUseCoreFeatures: true,
    canCreateProject: true,
    canGenerateReport: true,
    canEditEmissionFactors: true,
    reasonText: "라이선스가 활성화되었습니다."
  };
}
