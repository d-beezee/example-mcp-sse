import dotenv from "dotenv";
import FormData from "form-data";
import fetch from "node-fetch";
import * as fs from "node:fs";
dotenv.config();
const config = {
  tryberApi: {
    basePath: process.env.TRYBER_API_BASE_PATH,
    username: process.env.TRYBER_API_USERNAME,
    password: process.env.TRYBER_API_PASSWORD,
  },
};

class TryberApi {
  private baseUrl: string;
  private username: string;
  private password: string;

  constructor(private cp_id: number) {
    const { basePath, username, password } = config.tryberApi || {};

    this.baseUrl = basePath || "";
    this.username = username || "";
    this.password = password || "";
  }

  /**
   * Private method to fetch a token for API requests
   */
  private async getToken(): Promise<string> {
    const response = await fetch(`${this.baseUrl}/authenticate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: this.username,
        password: this.password,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to authenticate: " + response.statusText);
    }

    const data: any = await response.json();
    if (!data.token) {
      throw new Error("Authentication failed: Token not found");
    }

    return data.token;
  }

  /**import {createReadStream} from "fs";

   * Private method to perform authenticated POST requests
   */
  private async authPost(
    path: string,
    body: Record<string, any>
  ): Promise<any> {
    const token = await this.getToken();
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Failed to post to ${path}: ${response.statusText}`);
    }

    return response.json();
  }

  private async authPatch(
    path: string,
    body: Record<string, any>
  ): Promise<any> {
    const token = await this.getToken();
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Failed to PATCH to ${path}: ${response.statusText}`);
    }

    return response.json();
  }

  private async authGet(path: string): Promise<any> {
    const token = await this.getToken();
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to post to ${path}: ${response.statusText}`);
    }

    return response.json();
  }

  public async uploadMedia(
    filePath: string
  ): Promise<{ name: string; path: string }> {
    const token = await this.getToken();
    const formData = new FormData();
    formData.append("media", fs.createReadStream(filePath));
    const response = await fetch(`${this.baseUrl}/media`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });
    if (!response.ok) {
      throw new Error(`Failed to upload media: ${response.statusText}`);
    }
    const data: any = await response.json();
    const file = data.files?.[0];
    return file;
  }

  public async getFirstUsecaseId(): Promise<number> {
    const response = await this.authGet(`/campaigns/${this.cp_id}/tasks`);
    if (!response || !Array.isArray(response) || response.length === 0) {
      throw new Error("No tasks found for the campaign");
    }
    const firstTask = response[0];
    return firstTask.id;
  }

  /**
   * Public method to upload a bug report
   */
  public async uploadBugReport({
    USECASE_ID,
    title,
    bugType,
    severity,
    description,
    notes,
    criteria,
    level,
    media = [],
  }: {
    USECASE_ID: number;
    title: string;
    bugType: string;
    severity: string;
    description: string;
    notes: string;
    criteria: string;
    level: string;
    media?: string[];
  }) {
    const result = await this.authPost(
      `/users/me/campaigns/${this.cp_id}/bugs`,
      {
        title,
        description,
        expected: "-",
        current: "-",
        severity,
        replicability: "ALWAYS",
        type: bugType,
        notes,
        usecase: USECASE_ID,
        device: 78398,
        media,
        additional: [
          { slug: "wcag-criteria", value: criteria },
          { slug: "wcag-level", value: level },
          { slug: "type-of-screen-reader", value: "None" },
          { slug: "type-of-keyboard-used", value: "None" },
        ],
        lastSeen: toISOStringWithTimezone(),
      }
    );

    const bugId = result?.id;
    if (!bugId) {
      return false;
    }

    await this.authPatch(`/bugs/${bugId}/status`, {
      status_id: 2,
    });

    return true;
  }
}

export const toISOStringWithTimezone = () => {
  const date = new Date();
  const tzOffset = -date.getTimezoneOffset();
  const diff = tzOffset >= 0 ? "+" : "-";
  const pad = (n: number) => `${Math.floor(Math.abs(n))}`.padStart(2, "0");
  return (
    date.getFullYear() +
    "-" +
    pad(date.getMonth() + 1) +
    "-" +
    pad(date.getDate()) +
    "T" +
    pad(date.getHours()) +
    ":" +
    pad(date.getMinutes()) +
    ":" +
    pad(date.getSeconds()) +
    ".000" +
    diff +
    pad(tzOffset / 60) +
    ":" +
    pad(tzOffset % 60)
  );
};

export default TryberApi;
