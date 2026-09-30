import { JSX, JSXElement, splitProps } from "solid-js";

import { navigationEvent } from "../../events/navigation";
import { cn } from "../../utils/cn";

type LinkProps = Omit<
  JSX.AnchorHTMLAttributes<HTMLAnchorElement>,
  "onClick"
> & {
  onClick?: (event: MouseEvent) => void;
};

export function Link(props: LinkProps): JSXElement {
  const [local, rest] = splitProps(props, ["onClick", "class"]);
  return (
    <a
      {...rest}
      class={cn(local.class)}
      router-link
      onClick={(event) => {
        local.onClick?.(event);
        if (event.currentTarget.href) {
          event.preventDefault();
          navigationEvent.dispatch({
            url: event.currentTarget.href,
            options: {},
          });
        }
      }}
    >
      {props.children}
    </a>
  );
}
