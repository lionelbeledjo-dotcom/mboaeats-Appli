import { useState, type ImgHTMLAttributes, type CSSProperties } from "react";
import { cn } from "@/lib/utils";

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, "width" | "height"> & {
  /** CSS aspect-ratio, e.g. "1 / 1", "16 / 9", "4 / 3". Defaults to "1 / 1". */
  ratio?: string;
  /** Optional explicit pixel width/height (helps the browser reserve space). */
  width?: number;
  height?: number;
  /** Wrapper className (controls the reserved box). */
  wrapperClassName?: string;
  /** Image className (object-fit etc.). */
  className?: string;
  /** Rounded radius on wrapper (Tailwind class). */
  rounded?: string;
};

/**
 * SmartImage: locks a fixed aspect-ratio box, shows a shimmering skeleton until
 * the image is loaded, then fades it in. Prevents Cumulative Layout Shift (CLS)
 * during scroll — the layout never reflows when an image arrives.
 */
export function SmartImage({
  ratio = "1 / 1",
  width,
  height,
  wrapperClassName,
  className,
  rounded,
  loading = "lazy",
  decoding = "async",
  alt = "",
  onLoad,
  onError,
  style,
  ...rest
}: Props) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  const wrapperStyle: CSSProperties = {
    aspectRatio: ratio,
    contain: "layout paint",
    ...style,
  };

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden bg-muted",
        rounded,
        wrapperClassName,
      )}
      style={wrapperStyle}
    >
      {!loaded && !errored && (
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-r from-muted/60 via-primary/10 to-muted/60 bg-[length:200%_100%]"
          style={{ animation: "shimmer 1.4s ease-in-out infinite" }}
        />
      )}
      {/* eslint-disable-next-line jsx-a11y/alt-text */}
      <img
        {...rest}
        alt={alt}
        width={width}
        height={height}
        loading={loading}
        decoding={decoding}
        onLoad={(e) => {
          setLoaded(true);
          onLoad?.(e);
        }}
        onError={(e) => {
          setErrored(true);
          setLoaded(true);
          onError?.(e);
        }}
        className={cn(
          "absolute inset-0 h-full w-full object-cover transition-opacity duration-300",
          loaded ? "opacity-100" : "opacity-0",
          className,
        )}
      />
    </div>
  );
}

export default SmartImage;
