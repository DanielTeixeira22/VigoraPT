/**
 * Utilitário de Email
 * Configuração do Nodemailer para envio de emails transacionais.
 */

import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

// ============================================================================
// Configuração
// ============================================================================

let transporter: Transporter | null = null;

/**
 * Cria ou retorna o transporter SMTP.
 * Lazy initialization para garantir que as variáveis de ambiente estão carregadas.
 */
function getTransporter(): Transporter {
  if (!transporter) {
    const host = process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;



    if (!user || !pass) {
      console.error('[Email] ERRO: SMTP_USER ou SMTP_PASS não configurados no .env');
    }

    transporter = nodemailer.createTransport({
      host,
      port,
      secure: false, // true para 465, false para outras portas
      auth: { user, pass },
    });
  }
  return transporter;
}

// ============================================================================
// Funções de Envio
// ============================================================================

/**
 * Envia email de recuperação de password.
 * 
 * @param to - Email do destinatário
 * @param resetUrl - URL completo para reset de password
 */
export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  const from = process.env.SMTP_FROM || '"Vigora" <noreply@vigora.pt>';

  const html = `
<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 0;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #38A169 0%, #2F855A 100%); padding: 40px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">Vigora</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 14px;">Plataforma de Personal Trainers</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="color: #1a202c; margin: 0 0 16px 0; font-size: 22px;">Recuperação de Password</h2>
              <p style="color: #4a5568; line-height: 1.6; margin: 0 0 24px 0;">
                Recebemos um pedido para redefinir a password da tua conta. Se não fizeste este pedido, podes ignorar este email.
              </p>
              <p style="color: #4a5568; line-height: 1.6; margin: 0 0 32px 0;">
                Clica no botão abaixo para criar uma nova password. Este link expira em <strong>1 hora</strong>.
              </p>
              
              <!-- Button (Bulletproof - compatível com Outlook) -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto;">
                <tr>
                  <td style="border-radius: 8px; background-color: #38A169;">
                    <a href="${resetUrl}" target="_blank" style="display: inline-block; padding: 16px 40px; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px; background-color: #38A169; border-radius: 8px; border: 1px solid #38A169;">
                      Redefinir Password
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="color: #718096; font-size: 13px; line-height: 1.6; margin: 32px 0 0 0;">
                Se o botão não funcionar, copia e cola este link no teu browser:
              </p>
              <p style="color: #38A169; font-size: 13px; word-break: break-all; margin: 8px 0 0 0;">
                ${resetUrl}
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f7fafc; padding: 24px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="color: #a0aec0; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} Vigora. Todos os direitos reservados.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const text = `
Recuperação de Password - Vigora

Recebemos um pedido para redefinir a password da tua conta.
Se não fizeste este pedido, podes ignorar este email.

Para criar uma nova password, acede ao seguinte link (expira em 1 hora):
${resetUrl}

---
© ${new Date().getFullYear()} Vigora. Todos os direitos reservados.
  `.trim();



  try {
    const transport = getTransporter();
    const result = await transport.sendMail({
      from,
      to,
      subject: 'Recuperação de Password - Vigora',
      text,
      html,
    });

  } catch (error) {
    console.error('[Email] ERRO ao enviar email:', error);
    throw error; // Re-throw para que o controller possa tratar
  }
}
