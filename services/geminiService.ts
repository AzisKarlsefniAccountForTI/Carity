
import { GoogleGenAI, Type } from "@google/genai";
import { AIResult } from "../types";

export const parseSigmaCommand = async (input: string): Promise<AIResult | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Kamu adalah Bahliljule, Protokol Keamanan AI untuk "Misi Menjadi Sigma". 
    Tugasmu adalah memproses perintah keuangan dari Azis Ganteng atau Siska Gemoy.
    
    Tentukan Aksi (action):
    1. 'deposit': Menambah tabungan donasi utama.
    2. 'vault_lock': Memindahkan dana dari saldo utama ke Brankas/Dana Darurat (Kunci Dana).
    3. 'vault_release': Mengeluarkan dana dari Brankas kembali ke saldo utama (Lepas Dana).

    Input User: "${input}"
    
    Aturan:
    - Jika user ingin "amankan", "kunci", "simpan di brankas", "proteksi", itu adalah 'vault_lock'.
    - Jika user ingin "keluarkan", "ambil dari brankas", "lepas", "unfreeze", itu adalah 'vault_release'.
    - Jika cuma "nabung", "setor", "tambah", itu adalah 'deposit'.
    - Ekstrak nominal uang (konversi 100rb ke 100000).
    - Ekstrak alasan (reason) jika untuk vault.
    - Default saver: Azis Ganteng (jika maskulin/netral) atau Siska Gemoy (jika feminin).`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          action: {
            type: Type.STRING,
            enum: ['deposit', 'vault_lock', 'vault_release']
          },
          saver: {
            type: Type.STRING,
            enum: ['Azis Ganteng', 'Siska Gemoy']
          },
          amount: {
            type: Type.NUMBER
          },
          note: {
            type: Type.STRING
          },
          reason: {
            type: Type.STRING,
            description: "Alasan untuk operasional brankas"
          },
          confidence: {
            type: Type.NUMBER
          }
        },
        required: ["action", "amount"]
      }
    }
  });

  // Access text property directly and handle potential undefined value
  const text = response.text;
  if (!text) {
    return null;
  }

  try {
    // Trim string before parsing as recommended
    return JSON.parse(text.trim()) as AIResult;
  } catch (error) {
    console.error("Bahliljule Command Error:", error);
    return null;
  }
};
