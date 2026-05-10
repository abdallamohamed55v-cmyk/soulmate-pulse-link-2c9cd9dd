import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle2, Loader2, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const BillingSuccessPage = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "pending" | "failed">("loading");
  const [details, setDetails] = useState<any>(null);

  useEffect(() => {
    const checkoutId = params.get("checkout_id");
    if (!checkoutId) {
      setStatus("failed");
      return;
    }
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke(`polar-verify?checkout_id=${checkoutId}`, {
          method: "GET",
        });
        if (error) throw error;
        setDetails(data);
        if (data.status === "succeeded") setStatus("success");
        else if (data.status === "open") setStatus("pending");
        else setStatus("failed");
      } catch {
        setStatus("failed");
      }
    })();
  }, [params]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-card border border-border rounded-3xl p-8 text-center"
      >
        {status === "loading" && (
          <>
            <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary mb-4" />
            <h1 className="text-2xl font-bold text-foreground mb-2">جارٍ تأكيد الدفع...</h1>
            <p className="text-muted-foreground">لحظات من فضلك</p>
          </>
        )}
        {status === "success" && (
          <>
            <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-12 h-12 text-emerald-500" />
            </div>
            <h1 className="text-3xl font-black text-foreground mb-3">تم الدفع بنجاح! 🎉</h1>
            <p className="text-muted-foreground mb-2">
              {details?.product_name && `اشتراكك في ${details.product_name} مفعّل الآن.`}
            </p>
            {details?.amount && (
              <p className="text-sm text-muted-foreground mb-6">
                ${(details.amount / 100).toFixed(2)} {details.currency?.toUpperCase()}
              </p>
            )}
            <button
              onClick={() => navigate("/")}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 transition"
            >
              ابدأ الآن <ArrowRight className="w-4 h-4" />
            </button>
          </>
        )}
        {status === "pending" && (
          <>
            <h1 className="text-2xl font-bold text-foreground mb-2">الدفع قيد المعالجة</h1>
            <p className="text-muted-foreground mb-6">سيتم تفعيل اشتراكك خلال دقائق.</p>
            <button onClick={() => navigate("/billing")} className="px-6 py-3 rounded-xl bg-secondary text-foreground">
              عرض الفواتير
            </button>
          </>
        )}
        {status === "failed" && (
          <>
            <h1 className="text-2xl font-bold text-foreground mb-2">تعذّر تأكيد الدفع</h1>
            <p className="text-muted-foreground mb-6">إذا تم خصم المبلغ سيتم إرجاعه تلقائياً.</p>
            <button onClick={() => navigate("/pricing")} className="px-6 py-3 rounded-xl bg-secondary text-foreground">
              العودة للأسعار
            </button>
          </>
        )}
      </motion.div>
    </div>
  );
};

export default BillingSuccessPage;
