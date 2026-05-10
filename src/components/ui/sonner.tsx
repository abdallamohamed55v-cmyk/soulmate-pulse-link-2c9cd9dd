import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      position="top-center"
      offset={12}
      duration={2000}
      visibleToasts={1}
      gap={6}
      className="toaster group [--width:fit-content]"
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            "pointer-events-auto mx-auto !w-fit min-w-0 max-w-[80vw] inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-black/85 backdrop-blur-xl text-white text-[12.5px] font-medium leading-none shadow-[0_4px_16px_-4px_rgba(0,0,0,0.45)] ring-1 ring-white/[0.06] [&>[data-icon]]:flex [&>[data-icon]]:w-3.5 [&>[data-icon]]:h-3.5 [&>[data-icon]]:shrink-0 [&>[data-icon]_svg]:w-3.5 [&>[data-icon]_svg]:h-3.5",
          title: "min-w-0 truncate text-[12.5px] font-medium leading-none text-white",
          description: "hidden",
          actionButton: "ml-1.5 text-[12px] text-primary font-medium",
          cancelButton: "ml-1.5 text-[12px] text-white/60",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
