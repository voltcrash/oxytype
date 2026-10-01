import { JSX, JSXElement, splitProps } from "solid-js";

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
      {...{ link: true, noScroll: true }}
      onClick={(event) => local.onClick?.(event)}
    >
      {props.children}
    </a>
  );
}
