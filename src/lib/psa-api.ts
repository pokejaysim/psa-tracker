import { PSACertResult, PSAOrderProgress } from "@/types";

const PSA_API_BASE = "https://api.psacard.com/publicapi";

export async function getAuthToken(): Promise<string> {
  const token = process.env.PSA_API_TOKEN;

  if (!token) {
    throw new Error("PSA_API_TOKEN not configured in .env.local");
  }

  return token;
}

export async function getCertByNumber(
  certNumber: string
): Promise<PSACertResult | null> {
  const token = await getAuthToken();

  const response = await fetch(
    `${PSA_API_BASE}/cert/GetByCertNumber/${certNumber}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error(`PSA cert lookup failed: ${response.status}`);
  }

  const data = await response.json();
  if (!data.PSACert) return null;
  return data.PSACert as PSACertResult;
}

export async function getOrderProgress(
  orderNumber: string
): Promise<PSAOrderProgress | null> {
  const token = await getAuthToken();

  const response = await fetch(
    `${PSA_API_BASE}/order/GetProgress/${orderNumber}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error(`PSA order progress failed: ${response.status}`);
  }

  return (await response.json()) as PSAOrderProgress;
}

export async function getSubmissionProgress(
  submissionNumber: string
): Promise<PSAOrderProgress | null> {
  const token = await getAuthToken();

  const response = await fetch(
    `${PSA_API_BASE}/order/GetSubmissionProgress/${submissionNumber}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error(`PSA submission progress failed: ${response.status}`);
  }

  return (await response.json()) as PSAOrderProgress;
}

export async function getCertImages(
  certNumber: string
): Promise<{ front: string | null; back: string | null }> {
  const token = await getAuthToken();

  const response = await fetch(
    `${PSA_API_BASE}/cert/GetImagesByCertNumber/${certNumber}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!response.ok) {
    return { front: null, back: null };
  }

  const data = await response.json();
  return {
    front: data.FrontImageURL || null,
    back: data.BackImageURL || null,
  };
}
