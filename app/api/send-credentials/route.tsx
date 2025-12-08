import { type NextRequest, NextResponse } from "next/server"
import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest) {
  console.log("[v0] Email API route called")

  try {
    const body = await request.json()
    console.log("[v0] Request body:", body)

    const { recipientEmail, recipientName, username, password, userType } = body

    // Validation
    if (!recipientEmail || !recipientName || !username || !password) {
      console.error("[v0] Missing required fields:", { recipientEmail, recipientName, username, password })
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    console.log("[v0] Sending email to:", recipientEmail)

    // Send email using Resend
    const { data, error } = await resend.emails.send({
      from: "noreply@nerium-lnc.com",
      to: recipientEmail,
      subject: "Vos identifiants de connexion - EduPlan",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Identifiants de connexion - EduPlan</title>
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 28px;">EduPlan</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Gestion de plans de classe</p>
            </div>
            
            <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
              <h2 style="color: #667eea; margin-top: 0;">Bonjour ${recipientName},</h2>
              
              <p>Vos identifiants de connexion à <strong>EduPlan</strong> ont été créés avec succès.</p>
              
              <div style="background: white; padding: 25px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #667eea;">
                <h3 style="margin-top: 0; color: #667eea;">Vos identifiants</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 10px 0; font-weight: bold; color: #555;">Identifiant :</td>
                    <td style="padding: 10px 0; font-family: 'Courier New', monospace; background: #f5f5f5; padding: 8px 12px; border-radius: 4px;">${username}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; font-weight: bold; color: #555;">Mot de passe :</td>
                    <td style="padding: 10px 0; font-family: 'Courier New', monospace; background: #f5f5f5; padding: 8px 12px; border-radius: 4px;">${password}</td>
                  </tr>
                </table>
              </div>
              
              <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; border-radius: 4px; margin: 20px 0;">
                <p style="margin: 0; color: #856404;">
                  <strong>⚠️ Important :</strong> Conservez ces identifiants en lieu sûr. Vous pouvez modifier votre mot de passe après votre première connexion.
                </p>
              </div>
              
              <h3 style="color: #667eea;">Comment se connecter ?</h3>
              <ol style="color: #555; padding-left: 20px;">
                <li style="margin: 10px 0;">Rendez-vous sur la plateforme EduPlan</li>
                <li style="margin: 10px 0;">Cliquez sur "Se connecter"</li>
                <li style="margin: 10px 0;">Saisissez votre identifiant et votre mot de passe</li>
                <li style="margin: 10px 0;">Cliquez sur "Connexion"</li>
              </ol>
              
              <p style="color: #666; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
                Si vous rencontrez des difficultés pour vous connecter, contactez votre vie scolaire.
              </p>
            </div>
            
            <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
              <p>Cet email a été envoyé automatiquement par EduPlan. Merci de ne pas y répondre.</p>
            </div>
          </body>
        </html>
      `,
    })

    if (error) {
      console.error("[v0] Resend error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log("[v0] Email sent successfully:", data)
    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("[v0] Error in email API route:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}
