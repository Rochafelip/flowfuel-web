# Email de redefinição de senha com link Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trocar o email de "esqueci minha senha" (backend `flowfuel`) de um código para colar manualmente por um link clicável que abre `ResetPassword.tsx` já com o token preenchido, mantendo o campo editável como fallback.

**Architecture:** `SmtpPasswordResetNotifier` monta uma URL `{linkBaseUrl}?token=...&email=...` e envia como botão (HTML) + link em texto (plain text e fallback discreto no HTML). Um validador fail-fast impede subir em prod/staging com a URL apontando pra localhost. `ResetPassword.tsx` passa a ler `token` da query string, igual a `email`.

**Tech Stack:** Backend: Spring Boot 3.5 / Java 21 / JUnit 5 + Mockito + AssertJ. Frontend: React + TypeScript, sem framework de testes configurado (verificação via `npm run build`).

---

## Referência: spec

`docs/superpowers/specs/2026-08-31-password-reset-email-link-design.md`

## File Structure

Backend (`/home/rocha/Projetos/flowfuel`):
- Modify: `src/main/resources/application.properties` — nova propriedade `flowfuel.password-reset.link-base-url`.
- Modify: `src/main/java/com/devappmobile/flowfuel/user/SmtpPasswordResetNotifier.java` — monta e envia o link em vez do código puro.
- Modify: `src/test/java/com/devappmobile/flowfuel/user/SmtpPasswordResetNotifierTest.java` — testes atualizados para o novo formato (link em vez de "sem link").
- Create: `src/main/java/com/devappmobile/flowfuel/config/PasswordResetLinkValidator.java` — fail-fast em prod/staging.
- Create: `src/test/java/com/devappmobile/flowfuel/config/PasswordResetLinkValidatorTest.java`.

Frontend (`/home/rocha/Projetos/flowfuel-frontend`):
- Modify: `src/routes/ResetPassword.tsx` — lê `token` da query string.

---

### Task 1: Testes do notificador (RED) — email agora deve conter o link

**Files:**
- Modify: `/home/rocha/Projetos/flowfuel/src/test/java/com/devappmobile/flowfuel/user/SmtpPasswordResetNotifierTest.java`

- [ ] **Step 1: Substituir os 3 testes atuais pelos novos, cobrindo link + url-encoding**

Substitua o conteúdo de `SmtpPasswordResetNotifierTest.java` (mantendo o mesmo `setUp`/helpers) pelos testes abaixo. Arquivo completo resultante:

```java
package com.devappmobile.flowfuel.user;

import jakarta.mail.Part;
import jakarta.mail.Multipart;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.util.ReflectionTestUtils;

import jakarta.mail.Session;
import java.util.Properties;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SmtpPasswordResetNotifierTest {

    @Mock
    private JavaMailSender mailSender;

    private SmtpPasswordResetNotifier notifier;

    @BeforeEach
    void setUp() {
        notifier = new SmtpPasswordResetNotifier(mailSender);
        ReflectionTestUtils.setField(notifier, "from", "no-reply@flowfuel.app");
        ReflectionTestUtils.setField(notifier, "tokenTtlMinutes", 30L);
        ReflectionTestUtils.setField(notifier, "linkBaseUrl", "http://localhost:5173/reset-password");
        when(mailSender.createMimeMessage())
                .thenReturn(new MimeMessage(Session.getDefaultInstance(new Properties())));
    }

    private User buildUser(String email) {
        User user = new User(email, "hashed", "Fulano");
        user.setId(1L);
        return user;
    }

    private MimeMessage captureSentMessage() throws Exception {
        ArgumentCaptor<MimeMessage> captor = ArgumentCaptor.forClass(MimeMessage.class);
        verify(mailSender).send(captor.capture());
        MimeMessage message = captor.getValue();
        message.saveChanges();
        return message;
    }

    private String findPartContent(Part part, String mimeType) throws Exception {
        if (part.isMimeType(mimeType)) {
            return (String) part.getContent();
        }
        if (part.isMimeType("multipart/*")) {
            Multipart multipart = (Multipart) part.getContent();
            for (int i = 0; i < multipart.getCount(); i++) {
                String found = findPartContent(multipart.getBodyPart(i), mimeType);
                if (found != null) {
                    return found;
                }
            }
        }
        return null;
    }

    @Test
    void sendResetToken_incluiLinkNoHtml() throws Exception {
        notifier.sendResetToken(buildUser("fulano@example.com"), "abc123token");

        String html = findPartContent(captureSentMessage(), "text/html");

        assertThat(html)
                .contains("http://localhost:5173/reset-password?")
                .contains("token=abc123token")
                .contains("email=fulano%40example.com");
    }

    @Test
    void sendResetToken_incluiLinkNoPlainText() throws Exception {
        notifier.sendResetToken(buildUser("fulano@example.com"), "abc123token");

        String plain = findPartContent(captureSentMessage(), "text/plain");

        assertThat(plain)
                .contains("http://localhost:5173/reset-password?")
                .contains("token=abc123token")
                .contains("email=fulano%40example.com");
    }

    @Test
    void sendResetToken_urlEncodeEmailComCaracteresEspeciais() throws Exception {
        notifier.sendResetToken(buildUser("fulano+teste@example.com"), "abc123token");

        String html = findPartContent(captureSentMessage(), "text/html");

        assertThat(html).contains("email=fulano%2Bteste%40example.com");
    }
}
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `cd /home/rocha/Projetos/flowfuel && ./mvnw -q test -Dtest=SmtpPasswordResetNotifierTest`
Expected: falha de compilação ou asserção — `linkBaseUrl` ainda não existe em `SmtpPasswordResetNotifier`, e o corpo do email ainda não contém a URL.

---

### Task 2: Implementar o link no notificador (GREEN)

**Files:**
- Modify: `/home/rocha/Projetos/flowfuel/src/main/java/com/devappmobile/flowfuel/user/SmtpPasswordResetNotifier.java`

- [ ] **Step 1: Reescrever o arquivo com o link no lugar do código**

Substitua o conteúdo completo de `SmtpPasswordResetNotifier.java`:

```java
package com.devappmobile.flowfuel.user;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Component;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

/**
 * Implementacao real de {@link PasswordResetNotifier}: envia um link de reset
 * por email via {@link JavaMailSender} (SMTP). Ativa quando
 * {@code flowfuel.mail.enabled=true} (prod/staging).
 *
 * <p>Mesmo padrao de {@link SmtpAccountActivationNotifier}: envia em
 * {@code multipart/alternative} (HTML + texto), provider-agnostico via
 * {@code spring.mail.*}. Diferente da ativacao (que usa codigo numerico), o
 * reset de senha usa um token opaco longo — nao pratico para digitacao manual
 * — entao o email traz um botao/link que abre {@code linkBaseUrl} com
 * {@code ?token=...&email=...}, mesmo padrao que existiu no email de
 * ativacao antes da mudanca para codigo (ver historico git, commit 9b54f3d).
 */
@Component
@ConditionalOnProperty(name = "flowfuel.mail.enabled", havingValue = "true")
@RequiredArgsConstructor
public class SmtpPasswordResetNotifier implements PasswordResetNotifier {

    private static final Logger log = LoggerFactory.getLogger(SmtpPasswordResetNotifier.class);

    private final JavaMailSender mailSender;

    @Value("${flowfuel.mail.from:no-reply@flowfuel.app}")
    private String from;

    // Mesmo valor que o PasswordResetService usa para o TTL do token, para que
    // o prazo exibido no email seja sempre coerente com o real.
    @Value("${flowfuel.password-reset.token-ttl-minutes:30}")
    private long tokenTtlMinutes;

    @Value("${flowfuel.password-reset.link-base-url:http://localhost:5173/reset-password}")
    private String linkBaseUrl;

    @Override
    public void sendResetToken(User user, String resetToken) {
        String greetingName = user.getName() != null ? " " + user.getName() : "";
        String validity = formatValidity(tokenTtlMinutes);
        String resetUrl = buildResetUrl(user.getEmail(), resetToken);

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(from);
            helper.setTo(user.getEmail());
            helper.setSubject("Redefinição de senha FlowFuel");
            helper.setText(plainBody(greetingName, validity, resetUrl),
                    htmlBody(greetingName, validity, resetUrl));

            mailSender.send(message);
            log.info("[PASSWORD-RESET] email enviado userId={} email={}", user.getId(), user.getEmail());
        } catch (MailException | MessagingException ex) {
            // Nao vazar o token; logar a falha para investigacao (Sentry via logback).
            log.error("[PASSWORD-RESET] falha ao enviar email userId={} email={}",
                    user.getId(), user.getEmail(), ex);
            throw new IllegalStateException("Falha ao enviar email de redefinição de senha", ex);
        }
    }

    private String buildResetUrl(String email, String resetToken) {
        String encodedToken = URLEncoder.encode(resetToken, StandardCharsets.UTF_8);
        String encodedEmail = URLEncoder.encode(email, StandardCharsets.UTF_8);
        return "%s?token=%s&email=%s".formatted(linkBaseUrl, encodedToken, encodedEmail);
    }

    private static String plainBody(String greetingName, String validity, String resetUrl) {
        return """
                Olá%s,

                Recebemos uma solicitação para redefinir a senha da sua conta FlowFuel.
                Clique no link abaixo para escolher uma nova senha (válido por %s):

                %s

                Se você não solicitou esta redefinição, ignore este email — sua senha
                atual continua válida.

                — Equipe FlowFuel"""
                .formatted(greetingName, validity, resetUrl);
    }

    private static String htmlBody(String greetingName, String validity, String resetUrl) {
        return """
                <!DOCTYPE html>
                <html lang="pt-BR">
                <body style="margin:0;padding:0;background-color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
                  <table role="presentation" width="100%%" cellpadding="0" cellspacing="0" style="padding:48px 16px;">
                    <tr>
                      <td align="center">
                        <table role="presentation" width="420" cellpadding="0" cellspacing="0">
                          <tr>
                            <td style="padding-bottom:32px;">
                              <span style="font-size:18px;font-weight:700;color:#111;">FlowFuel</span>
                            </td>
                          </tr>
                          <tr>
                            <td style="padding-bottom:8px;">
                              <p style="margin:0;font-size:22px;font-weight:600;color:#111;line-height:1.3;">Redefinir senha%s</p>
                            </td>
                          </tr>
                          <tr>
                            <td style="padding-bottom:32px;">
                              <p style="margin:0;font-size:15px;color:#555;line-height:1.6;">
                                Clique no botão abaixo para escolher uma nova senha. O link expira em %s.
                              </p>
                            </td>
                          </tr>
                          <tr>
                            <td style="padding-bottom:24px;" align="center">
                              <a href="%s" style="display:inline-block;background-color:#16a34a;color:#ffffff;font-size:16px;font-weight:700;padding:14px 32px;border-radius:8px;text-decoration:none;">Redefinir senha</a>
                            </td>
                          </tr>
                          <tr>
                            <td style="padding-bottom:32px;">
                              <p style="margin:0;font-size:12px;color:#999;line-height:1.6;word-break:break-all;">
                                Se o botão não funcionar, copie e cole este link no navegador:<br>%s
                              </p>
                            </td>
                          </tr>
                          <tr>
                            <td style="border-top:1px solid #eee;padding-top:24px;">
                              <p style="margin:0;font-size:13px;color:#999;line-height:1.6;">
                                Se você não solicitou esta redefinição, ignore este email — sua senha atual continua válida.
                              </p>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </body>
                </html>"""
                .formatted(greetingName, validity, resetUrl, resetUrl);
    }

    /** Converte o TTL em minutos numa frase amigavel: "1 hora", "2 horas", "30 minutos". */
    private static String formatValidity(long minutes) {
        if (minutes % 60 == 0) {
            long hours = minutes / 60;
            return hours == 1 ? "1 hora" : hours + " horas";
        }
        return minutes + " minutos";
    }
}
```

- [ ] **Step 2: Rodar o teste e confirmar que passa**

Run: `cd /home/rocha/Projetos/flowfuel && ./mvnw -q test -Dtest=SmtpPasswordResetNotifierTest`
Expected: 3/3 testes passam.

- [ ] **Step 3: Commit**

```bash
cd /home/rocha/Projetos/flowfuel
git add src/main/java/com/devappmobile/flowfuel/user/SmtpPasswordResetNotifier.java src/test/java/com/devappmobile/flowfuel/user/SmtpPasswordResetNotifierTest.java
git commit -m "feat(user): send password reset email as a link instead of a bare token"
```

---

### Task 3: Nova propriedade `link-base-url`

**Files:**
- Modify: `/home/rocha/Projetos/flowfuel/src/main/resources/application.properties`

- [ ] **Step 1: Adicionar a propriedade**

Em `application.properties`, logo após a linha `flowfuel.password-reset.cleanup.retention-days=${PASSWORD_RESET_RETENTION_DAYS:7}` (dentro do bloco "Redefinicao de senha"), adicionar:

```properties
# Rota do frontend que recebe ?token=...&email=... e chama POST /api/v1/auth/reset-password.
flowfuel.password-reset.link-base-url=${PASSWORD_RESET_LINK_BASE_URL:http://localhost:5173/reset-password}
```

- [ ] **Step 2: Commit**

```bash
cd /home/rocha/Projetos/flowfuel
git add src/main/resources/application.properties
git commit -m "feat: add password-reset link-base-url config"
```

---

### Task 4: Validador fail-fast (RED)

**Files:**
- Create: `/home/rocha/Projetos/flowfuel/src/test/java/com/devappmobile/flowfuel/config/PasswordResetLinkValidatorTest.java`

- [ ] **Step 1: Escrever o teste**

```java
package com.devappmobile.flowfuel.config;

import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class PasswordResetLinkValidatorTest {

    private PasswordResetLinkValidator validatorWithUrl(String url) {
        PasswordResetLinkValidator validator = new PasswordResetLinkValidator();
        ReflectionTestUtils.setField(validator, "linkBaseUrl", url);
        return validator;
    }

    @Test
    void urlValidaDeProducao_naoLanca() {
        assertThatCode(() -> validatorWithUrl("https://app.flowfuel.com/reset-password").validate())
                .doesNotThrowAnyException();
    }

    @Test
    void urlNula_lancaFailFast() {
        assertThatThrownBy(() -> validatorWithUrl(null).validate())
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("PASSWORD_RESET_LINK_BASE_URL");
    }

    @Test
    void urlVazia_lancaFailFast() {
        assertThatThrownBy(() -> validatorWithUrl("").validate())
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("PASSWORD_RESET_LINK_BASE_URL");
    }

    @Test
    void urlEmBranco_lancaFailFast() {
        assertThatThrownBy(() -> validatorWithUrl("   ").validate())
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("PASSWORD_RESET_LINK_BASE_URL");
    }

    @Test
    void urlComLocalhost_lancaFailFast() {
        assertThatThrownBy(() -> validatorWithUrl("http://localhost:5173/reset-password").validate())
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("localhost");
    }
}
```

- [ ] **Step 2: Rodar e confirmar que falha (compilação)**

Run: `cd /home/rocha/Projetos/flowfuel && ./mvnw -q test -Dtest=PasswordResetLinkValidatorTest`
Expected: erro de compilação — `PasswordResetLinkValidator` não existe.

---

### Task 5: Implementar o validador (GREEN)

**Files:**
- Create: `/home/rocha/Projetos/flowfuel/src/main/java/com/devappmobile/flowfuel/config/PasswordResetLinkValidator.java`

- [ ] **Step 1: Criar o validador**

```java
package com.devappmobile.flowfuel.config;

import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

/**
 * Fail-fast do link de redefinicao de senha em producao/staging.
 *
 * <p>{@code flowfuel.password-reset.link-base-url} tem como default
 * {@code http://localhost:5173/reset-password} em {@code application.properties},
 * valido para {@code dev}/{@code test}. Em {@code prod}/{@code staging}, se a
 * env var {@code PASSWORD_RESET_LINK_BASE_URL} nao for configurada, o
 * {@code SmtpPasswordResetNotifier} enviaria emails reais com um link
 * {@code localhost} quebrado para o usuario. Esta classe impede a aplicacao de
 * subir nesse caso — mesmo padrao do antigo {@code ActivationLinkValidator}.
 */
@Configuration
@Profile({"prod", "staging"})
public class PasswordResetLinkValidator {

    @Value("${flowfuel.password-reset.link-base-url:}")
    private String linkBaseUrl;

    @PostConstruct
    void validate() {
        if (linkBaseUrl == null || linkBaseUrl.isBlank() || linkBaseUrl.contains("localhost")) {
            throw new IllegalStateException(
                    "PASSWORD_RESET_LINK_BASE_URL nao pode ser vazio ou apontar para "
                            + "localhost em producao/staging.");
        }
    }
}
```

- [ ] **Step 2: Rodar o teste e confirmar que passa**

Run: `cd /home/rocha/Projetos/flowfuel && ./mvnw -q test -Dtest=PasswordResetLinkValidatorTest`
Expected: 5/5 testes passam.

- [ ] **Step 3: Rodar a suíte completa do backend**

Run: `cd /home/rocha/Projetos/flowfuel && ./mvnw -q test`
Expected: exit code 0 (inclui `FlowFuelApplicationTests`, garantindo que o novo `@Configuration` não quebra o boot do contexto em nenhum profile ativo por padrão — o validador só ativa em `prod`/`staging`, perfis não usados nos testes).

- [ ] **Step 4: Commit**

```bash
cd /home/rocha/Projetos/flowfuel
git add src/main/java/com/devappmobile/flowfuel/config/PasswordResetLinkValidator.java src/test/java/com/devappmobile/flowfuel/config/PasswordResetLinkValidatorTest.java
git commit -m "feat: fail-fast validation for password-reset link-base-url in prod/staging"
```

---

### Task 6: Frontend — pré-preencher token da query string

**Files:**
- Modify: `src/routes/ResetPassword.tsx`

- [ ] **Step 1: Ler `token` da query string**

Em `src/routes/ResetPassword.tsx`, troque:

```tsx
  const [token, setToken] = useState('')
```

por:

```tsx
  const [token, setToken] = useState(searchParams.get('token') ?? '')
```

- [ ] **Step 2: Verificar build**

Run: `npm run build`
Expected: build passa sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/routes/ResetPassword.tsx
git commit -m "feat: prefill reset-password token from magic-link query param"
```

---

### Task 7: Verificação final e push

- [ ] **Step 1: Suíte completa do backend**

Run: `cd /home/rocha/Projetos/flowfuel && ./mvnw -q test`
Expected: exit code 0.

- [ ] **Step 2: Build do frontend**

Run: `npm run build` (em `/home/rocha/Projetos/flowfuel-frontend`)
Expected: build passa sem erros.

- [ ] **Step 3: Push dos dois repositórios**

```bash
cd /home/rocha/Projetos/flowfuel && git push
cd /home/rocha/Projetos/flowfuel-frontend && git push
```

Conforme preferência já registrada, a verificação funcional final (abrir o
link do email, conferir que o token pré-preenche o campo) é feita no
ambiente de deploy, não com servidor local/browser automation.
