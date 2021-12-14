import { ArrowLeftIcon } from "@heroicons/react/solid";
import classNames from "classnames";
import { GetServerSidePropsContext } from "next";
import { getCsrfToken, signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { ErrorCode, getSession } from "@lib/auth";
import { WEBSITE_URL } from "@lib/config/constants";
import { useLocale } from "@lib/hooks/useLocale";
import { isSAMLLoginEnabled, hostedCal, samlTenantID, samlProductID } from "@lib/saml";
import { collectPageParameters, telemetryEventTypes, useTelemetry } from "@lib/telemetry";
import { inferSSRProps } from "@lib/types/inferSSRProps";

import AddToHomescreen from "@components/AddToHomescreen";
import SAMLLogin from "@components/auth/SAMLLogin";
import TwoFactor from "@components/auth/TwoFactor";
import { EmailField, PasswordField, Form } from "@components/form/fields";
import { Alert } from "@components/ui/Alert";
import AuthContainer from "@components/ui/AuthContainer";
import Button from "@components/ui/Button";

import { IS_GOOGLE_LOGIN_ENABLED } from "@server/lib/constants";
import { ssrInit } from "@server/lib/ssr";

interface LoginValues {
  email: string;
  password: string;
  totpCode: string;
  csrfToken: string;
}

export default function Login({
  csrfToken,
  isGoogleLoginEnabled,
  isSAMLLoginEnabled,
  hostedCal,
  samlTenantID,
  samlProductID,
}: inferSSRProps<typeof getServerSideProps>) {
  const { t } = useLocale();
  const router = useRouter();
  const form = useForm<LoginValues>();

  const [twoFactorRequired, setTwoFactorRequired] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const errorMessages: { [key: string]: string } = {
    // [ErrorCode.SecondFactorRequired]: t("2fa_enabled_instructions"),
    [ErrorCode.IncorrectPassword]: `${t("incorrect_password")} ${t("please_try_again")}`,
    [ErrorCode.UserNotFound]: t("no_account_exists"),
    [ErrorCode.IncorrectTwoFactorCode]: `${t("incorrect_2fa_code")} ${t("please_try_again")}`,
    [ErrorCode.InternalServerError]: `${t("something_went_wrong")} ${t("please_try_again_and_contact_us")}`,
    [ErrorCode.ThirdPartyIdentityProviderEnabled]: t("account_created_with_identity_provider"),
  };

  const telemetry = useTelemetry();

  const callbackUrl = typeof router.query?.callbackUrl === "string" ? router.query.callbackUrl : "/";

  const LoginFooter = (
    <span>
      {t("dont_have_an_account")}{" "}
      <a href={`${WEBSITE_URL}/signup`} className="font-medium text-neutral-900">
        {t("create_an_account")}
      </a>
    </span>
  );

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <HeadSeo title={t("login")} description={t("login")} />

      {isSubmitting && (
        <div className="z-50 absolute w-full h-screen bg-gray-50 flex items-center">
          <Loader />
        </div>
      )}

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <img
          className="h-6 mx-auto"
          src="https://impactsuite.com/img/logo.svg"
          alt="cal.impactsuites.com Logo"
        />
        <h2 className="font-cal mt-6 text-center text-3xl font-bold text-neutral-900">
          {t("sign_in_account")}
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 mx-2 rounded-sm sm:px-10 border border-neutral-200">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <input name="csrfToken" type="hidden" defaultValue={csrfToken || undefined} hidden />
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-neutral-700">
                {t("email_address")}
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  required
                  value={email}
                  onInput={(e) => setEmail(e.currentTarget.value)}
                  className="appearance-none block w-full px-3 py-2 border border-neutral-300 rounded-sm shadow-sm placeholder-gray-400 focus:outline-none focus:ring-neutral-900 focus:border-neutral-900 sm:text-sm"
                />
              </div>
            </div>

  return (
    <>
      <AuthContainer
        title={t("login")}
        description={t("login")}
        loading={form.formState.isSubmitting}
        showLogo
        heading={twoFactorRequired ? t("2fa_code") : t("sign_in_account")}
        footerText={twoFactorRequired ? TwoFactorFooter : LoginFooter}>
        <Form
          form={form}
          className="space-y-6"
          handleSubmit={(values) => {
            signIn<"credentials">("credentials", { ...values, callbackUrl, redirect: false })
              .then((res) => {
                if (!res) setErrorMessage(errorMessages[ErrorCode.InternalServerError]);
                // we're logged in! let's do a hard refresh to the desired url
                else if (!res.error) window.location.replace(callbackUrl);
                // reveal two factor input if required
                else if (res.error === ErrorCode.SecondFactorRequired) setTwoFactorRequired(true);
                // fallback if error not found
                else setErrorMessage(errorMessages[res.error] || t("something_went_wrong"));
              })
              .catch(() => setErrorMessage(errorMessages[ErrorCode.InternalServerError]));
          }}>
          <input defaultValue={csrfToken || undefined} type="hidden" hidden {...form.register("csrfToken")} />

          <div className={classNames("space-y-6", { hidden: twoFactorRequired })}>
            <EmailField
              id="email"
              label={t("email_address")}
              placeholder="john.doe@example.com"
              required
              {...form.register("email")}
            />
            <div className="relative">
              <div className="absolute right-0 -top-[2px]">
                <Link href="/auth/forgot-password">
                  <a tabIndex={-1} className="text-sm font-medium text-primary-600">
                    {t("forgot")}
                  </a>
                </Link>
              </div>
              <PasswordField
                id="password"
                type="password"
                autoComplete="current-password"
                required
                {...form.register("password")}
              />
            </div>
          </div>

          {twoFactorRequired && <TwoFactor />}

          {errorMessage && <Alert severity="error" title={errorMessage} />}
          <div className="flex space-y-2">
            <Button
              className="flex justify-center w-full"
              type="submit"
              disabled={form.formState.isSubmitting}>
              {twoFactorRequired ? t("submit") : t("sign_in")}
            </Button>
          </div>
        </Form>

        {!twoFactorRequired && (
          <>
            {isGoogleLoginEnabled && (
              <div className="mt-5">
                <Button
                  color="secondary"
                  className="flex justify-center w-full"
                  data-testid={"google"}
                  onClick={async (e) => {
                    e.preventDefault();
                    // track Google logins. Without personal data/payload
                    telemetry.withJitsu((jitsu) =>
                      jitsu.track(telemetryEventTypes.googleLogin, collectPageParameters())
                    );
                    await signIn("google");
                  }}>
                  {t("signin_with_google")}
                </Button>
              </div>
            )}

            <div className="space-y-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-sm shadow-sm text-sm font-medium text-white bg-neutral-900 hover:bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black">
                {t("sign_in")}
              </button>
            </div>

            {errorMessage && <p className="mt-1 text-sm text-red-700">{errorMessage}</p>}
          </form>
        </div>
        <div className="mt-4 text-neutral-600 text-center text-sm">
          {t("dont_have_an_account")} {/* replace this with your account creation flow */}
          <a href="https://cal.impactsuites.com/signup" className="font-medium text-neutral-900">
            {t("create_an_account")}
          </a>
        </div>
      </div>

      <AddToHomescreen />
    </>
  );
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const { req } = context;
  const session = await getSession({ req });
  const ssr = await ssrInit(context);

  if (session) {
    return {
      redirect: {
        destination: "/",
        permanent: false,
      },
    };
  }

  return {
    props: {
      csrfToken: await getCsrfToken(context),
      trpcState: ssr.dehydrate(),
      isGoogleLoginEnabled: IS_GOOGLE_LOGIN_ENABLED,
      isSAMLLoginEnabled,
      hostedCal,
      samlTenantID,
      samlProductID,
    },
  };
}
