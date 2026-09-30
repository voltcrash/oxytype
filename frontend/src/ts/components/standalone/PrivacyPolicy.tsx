import { createSignal, Show } from "solid-js";

import { StandaloneHeader } from "./StandaloneHeader";

function copyUserName(): void {
  void navigator.clipboard.writeText("@miodec");
  alert("Copied To Clipboard!");
}

export function PrivacyPolicy() {
  const [isOptedOut, setOptedOut] = createSignal(false);
  const optOut = (): void => {
    const expires = new Date();
    expires.setTime(expires.getTime() + 1825 * 24 * 60 * 60 * 1000);
    document.cookie = `_pubcid_optout=1;expires=${expires.toUTCString()};path=/`;
    setOptedOut(true);
  };
  return (
    <>
      <StandaloneHeader label="Privacy Policy" />
      <main class="h-max text-text [&_a]:inline-block [&_a]:text-sub [&_a]:underline [&_a:hover]:text-text [&_h1]:mt-12 [&_h1]:mb-[0.67em] [&_h1]:text-[2rem] [&_h1]:font-normal [&_h1]:text-main [&_ol]:my-4 [&_ol]:list-decimal [&_ol]:pl-10 [&_p]:my-4 [&_ul]:my-4 [&_ul]:list-disc [&_ul]:pl-10">
        <p>
          {/* make sure to update this date every time the policy is changed */}
        </p>
        <p>Effective date: September 8, 2021</p>
        <p>Last updated: May 12, 2025</p>
        <p>
          Thanks for trusting Monkeytype (&apos;Monkeytype&apos;,
          &apos;we&apos;, &apos;us&apos;, &apos;our&apos;) with your personal
          information! We take our responsibility to you very seriously, and so
          this Privacy Statement describes how we handle your data.
        </p>
        <p>
          This Privacy Statement applies to all websites we own and operate and
          to all services we provide (collectively, the &apos;Services&apos;).
          So...PLEASE READ THIS PRIVACY STATEMENT CAREFULLY. By using the
          Services, you are expressly and voluntarily accepting the terms and
          conditions of this Privacy Statement and our Terms of Service, which
          include allowing us to process information about you.
        </p>
        <p>
          Under this Privacy Statement, we are the data controller responsible
          for processing your personal information. Our contact information
          appears at the end of this Privacy Statement.
        </p>
        <p>Table of Contents</p>
        {/* The last three internal links are redundant because the anchor stops at the same location but gives more context to the user when they are viewing the table of contents */}
        <ul>
          <li>
            {" "}
            <a href="#Data_Collection">What data do we collect?</a>{" "}
          </li>
          <li>
            {" "}
            <a href="#How_is_Data_Collected">
              How do we collect your data?
            </a>{" "}
          </li>
          <li>
            {" "}
            <a href="#Data_Usage">How will we use your data?</a>{" "}
          </li>
          <li>
            {" "}
            <a href="#Data_Storage">How do we store your data?</a>{" "}
          </li>
          <li>
            {" "}
            <a href="#Data_Protection_Rights">
              What are your data protection rights?
            </a>{" "}
          </li>
          <li>
            {" "}
            <a href="#Log_Data">What log data do we collect?</a>{" "}
          </li>
          <li>
            {" "}
            <a href="#Advertisements">Advertisements</a>{" "}
          </li>
          <li>
            {" "}
            <a href="#Cookies">What are cookies?</a>{" "}
          </li>
          <li>
            {" "}
            <a href="#Usage_of_Cookies">How do we use cookies?</a>{" "}
          </li>
          <li>
            {" "}
            <a href="#Types_of_Cookies_Used">
              What types of cookies do we use?
            </a>{" "}
          </li>
          <li>
            {" "}
            <a href="#Managing_Cookies">How to manage your cookies</a>{" "}
          </li>
          <li>
            {" "}
            <a href="#External_Websites">
              Privacy policies of other websites
            </a>{" "}
          </li>
          <li>
            {" "}
            <a href="#Privacy_Policy_Modifications">
              Changes to our privacy policy
            </a>{" "}
          </li>
          <li>
            {" "}
            <a href="#Contact_Info">How to contact us</a>{" "}
          </li>
        </ul>
        <h1 id="Data_Collection">What data do we collect?</h1>
        <p>Monkeytype collects the following data:</p>
        <ul>
          <li>Email</li>
          <li>Username</li>
          <li>Discord id and discord avatar id (if you provide it)</li>
          <li>Information about each typing test</li>
          <li>Your currently active settings</li>
          <li>How many typing tests you&apos;ve started and completed</li>
          <li>How long you&apos;ve been typing on the website</li>
        </ul>
        <p>Monkeytype does NOT collect:</p>
        <ul>
          <li>
            custom texts (they are stored in your browser&apos;s local storage)
          </li>
        </ul>{" "}
        <i>
          If you believe a certain data type is missing from the lists above,
          feel free to contact us and we will answer any questions and update
          the privacy policy.
        </i>
        <h1 id="How_is_Data_Collected">How do we collect your data?</h1>
        <p>
          You directly provide most of the data we collect. We collect data and
          process data when you:
        </p>
        <ul>
          <li>Create an account</li>
          <li>Complete a typing test</li>
          <li>Change settings on the website</li>
        </ul>
        <h1 id="Data_Usage">How will we use your data?</h1>
        <p>Monkeytype collects your data so that we can:</p>
        <ul>
          <li>
            Allow you to view result history of previous tests you completed
          </li>
          <li>
            Save results from tests you take and show you statistics based on
            them
          </li>
          <li>Remember your settings</li>
          <li>Display leaderboards</li>
        </ul>
        <p>
          If you are found to be cheating or exploiting the website, we may
          store hashed versions of your username, email and/or discord id to
          prevent you from creating new accounts.
        </p>
        <h1 id="Data_Storage">How do we store your data?</h1>
        <p>Monkeytype securely stores your data using MongoDB.</p>
        <h1 id="Data_Protection_Rights">
          What are your data protection rights?
        </h1>
        <p>
          Monkeytype would like to make sure you are fully aware of all of your
          data protection rights. Every user is entitled to the following:
        </p>
        <ul>
          <li>
            The right to access – You have the right to request Monkeytype for
            copies of your personal data. We may limit the number of times this
            request can be made to depending on the size of the request.
          </li>
          <li>
            The right to rectification – You have the right to request that
            Monkeytype correct any information you believe is inaccurate. You
            also have the right to request Monkeytype to complete the
            information you believe is incomplete.
          </li>
          <li>
            The right to erasure – You have the right to request that Monkeytype
            erase your personal data, under certain conditions. (Hashed data
            mentioned in the &quot;How will we use your data?&quot; section will
            not be deleted, as it is essential in preventing the exploitation of
            the website)
          </li>
          <li>
            The right to restrict processing – You have the right to request
            that Monkeytype restrict the processing of your personal data, under
            certain conditions.
          </li>
          <li>
            The right to object to processing – You have the right to object to
            Monkeytype processing of your personal data, under certain
            conditions.
          </li>
          <li>
            The right to data portability – You have the right to request that
            Monkeytype transfer the data that we have collected to another
            organization, or directly to you, under certain conditions.
          </li>
        </ul>
        {/* <p>If you make a request, we have one month to respond to you. If you would like to exercise any of these rights, please contact us at our email: support@monkeytype.com</p> */}
        <h1 id="Log_Data">Analytics</h1>
        <p>
          Like most websites, we use Google Analytics, which collects
          information that your browser sends whenever you visit the website.
          This data may include internet protocol (IP) addresses, browser type,
          Internet Service Provider (ISP), date and time stamp, referring/exit
          pages, and time spent on each page.{" "}
          <b>
            THIS DATA DOES NOT CONTAIN ANY PERSONALLY IDENTIFIABLE INFORMATION.
          </b>{" "}
          We use this information for analyzing trends, administering the site,
          tracking users&apos; movement on the website, and gathering
          demographic information.
        </p>
        <p>
          For more information on Google Analytics&apos; privacy policy, please
          visit:{" "}
          <a
            href="https://support.google.com/analytics/answer/6004245?hl=en"
            target="_blank"
            rel="noopener noreferrer"
          >
            https://support.google.com/analytics/answer/6004245?hl=en
          </a>{" "}
        </p>
        <h1 id="Sentry">Sentry</h1>
        <p>
          Sentry is a crash reporting service that helps us track errors and
          crashes on the website. It collects information about your device,
          browser, and the error that occurred. Sometimes it might also include
          an anonymized replay of your session. This information is used to
          track down bugs faster and improve our website.
        </p>
        <p>
          For more information on Sentry&apos;s privacy policy, please visit:{" "}
          <a
            href="https://sentry.io/privacy/"
            target="_blank"
            rel="noopener noreferrer"
          >
            https://sentry.io/privacy/
          </a>{" "}
        </p>
        <h1 id="Advertisements">Advertisements</h1>
        <p>
          {" "}
          <i>
            Advertisements on Monkeytype are optional. This section only applies
            to you if you have not disabled them.
          </i>{" "}
        </p>
        <p>
          All the ads served by us come through a third-party advertising
          company, Playwire. When you first load our website, before any ads are
          displayed, you are presented with a consent form (from a &quot;Content
          Management Platform&quot;, or CMP).
        </p>
        <p>
          Depending on the consent you provide in this form, various pieces of
          information may be used in order to provide advertisements on this
          website, other sites, and other forms of media about goods and
          services that may be of interest to you. This information is collected
          from you through the use of cookies, and you can withdraw your consent
          at any time by deleting the cookies from your Internet browser. Once
          deleted, the consent form from the CMP will be displayed to you again
          when you visit next time.
        </p>
        <p>
          {" "}
          <i>Common ID Cookie</i>{" "}
        </p>
        <p id="cookieP">
          This site uses cookies and similar tracking technologies such as the
          Common ID cookie to provide its services. Cookies are important
          devices for measuring advertising effectiveness and ensuring a robust
          online advertising industry. The Common ID cookie stores a unique user
          id in the first party domain and is accessible to our ad partners.
          This simple ID that can be utilized to improve user matching,
          especially for delivering ads to iOS and MacOS browsers. Users can opt
          out of the Common ID tracking cookie by clicking{" "}
          <a onClick={optOut} href="#opt-out">
            here
          </a>{" "}
          .
          <Show when={isOptedOut()}>
            <h3 class="[all:revert]" style={{ color: "green" }}>
              Optout Success!
            </h3>
          </Show>
        </p>
        <p>
          {" "}
          <i>Advertising Privacy Settings</i>{" "}
        </p>
        <p>
          FOR EU USERS ONLY: When you use our site, pre-selected companies may
          access and use certain information on your device and about your
          interests to serve ads or personalized content. To change your
          consent-choices, go to Monkeytype &gt; Settings &gt; Danger Zone
          section &gt; Update cookie preferences. From there you can open the
          CMP by clicking &quot;Click to change your preferences on ad related
          cookies&quot;
        </p>
        <h1 id="Cookies">What are cookies?</h1>
        <p>
          Cookies are text files placed on your computer to collect standard
          Internet log information and visitor behavior information. When you
          visit our websites, we may collect information from you automatically
          through cookies or similar technology.
        </p>
        <p>
          For further information, see{" "}
          <a
            href="https://en.wikipedia.org/wiki/HTTP_cookie"
            target="_blank"
            rel="noreferrer noopener"
          >
            HTTP cookie
          </a>{" "}
          {/*
	          We need this nbsp to make sure there's no missing whitespace in production.
            This is because without it the minifier collapses the whitespace after 
      	    "HTTP cookie" and the one after the closing `a` tag into a single space  
      	    located after "HTTP cookie" (inside the `a` tag), and because the `a` tag
      	    has display: inline-block, the space will not be rendered. Use &nbsp; to make
      	    sure the minifier doesn't remove it.
      	  */}
          &nbsp;on Wikipedia.
        </p>
        <h1 id="Usage_of_Cookies">How do we use cookies?</h1>
        <p>
          Monkeytype uses cookies in a range of ways to improve your experience
          on our website, including:
        </p>
        <ul>
          <li>Keeping you signed in</li>
          <li>Remembering your active settings</li>
          <li>Remembering your active tags</li>
          <li>Traffic analysis</li>
          <li>Advertisement purposes</li>
        </ul>
        <h1 id="Types_of_Cookies_Used">What types of cookies do we use?</h1>
        <p>
          There are a number of different types of cookies; however, our website
          uses functionality cookies. Monkeytype uses these cookies so we
          recognize you on our website and remember your previously selected
          settings.
        </p>
        <h1 id="Managing_Cookies">How to manage your cookies</h1>
        <p>
          You can set your browser not to accept cookies, and the above website
          tells you how to remove cookies from your browser. However, in a few
          cases, some of our website features may behave unexpectedly or fail to
          function as a result.
        </p>
        <h1 id="External_Websites">Privacy policies of other websites</h1>
        <p>
          Monkeytype contains links to other external websites.{" "}
          <b>
            {" "}
            <u>
              Our privacy policy only applies to our website, so if you click on
              a link to another website, you should read their privacy policy.
            </u>{" "}
          </b>{" "}
        </p>
        <h1 id="Privacy_Policy_Modifications">Changes to our privacy policy</h1>
        <p>
          Monkeytype keeps its privacy policy under regular review and places
          any updates on this web page. The Monkeytype privacy policy may be
          subject to change at any given time without notice.
        </p>
        {/* TODO: add way to view when file was last committed to using the GitHub api*/}
        <h1 id="Contact_Info">How to contact us</h1>
        <p>
          If you have any questions about Monkeytype’s privacy policy, the data
          we hold on you, or you would like to exercise one of your data
          protection rights, please do not hesitate to contact us.
        </p>
        <p>
          General inquiries:{" "}
          <a
            href="mailto: contact@monkeytype.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            contact@monkeytype.com
          </a>{" "}
        </p>
        <p>
          Advertising related inquiries:{" "}
          <a
            href="https://www.playwire.com/contact-direct-sales"
            target="_blank"
            rel="noopener noreferrer"
          >
            https://www.playwire.com/contact-direct-sales
          </a>{" "}
        </p>
        <p>
          Discord:{" "}
          <span
            aria-label="Click To Copy"
            data-balloon-pos="up"
            onClick={copyUserName}
          >
            @miodec
          </span>{" "}
        </p>
      </main>
    </>
  );
}
