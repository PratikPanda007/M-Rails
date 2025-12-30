import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const formSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
    email: z.string().trim().email("Invalid email address").max(255, "Email must be less than 255 characters"),
    phone: z.string().trim().min(10, "Phone number must be at least 10 digits").max(15, "Phone number must be less than 15 digits").regex(/^[0-9+\-\s]+$/, "Invalid phone number"),
});

const RESEND_COOLDOWN = 30; // seconds

interface BrochureDownloadDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const BrochureDownloadDialog = ({ open, onOpenChange }: BrochureDownloadDialogProps) => {
  const [step, setStep] = useState<"form" | "otp">("form");
    const [formData, setFormData] = useState({ name: "", email: "", phone: "" });
  const [otp, setOtp] = useState("");
  //const [generatedOtp, setGeneratedOtp] = useState("");
    const [errors, setErrors] = useState<{ name?: string; email?: string; phone?: string; otp?: string }>({});
    const [resendCountdown, setResendCountdown] = useState(0);
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

  const { toast } = useToast();

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendCountdown > 0) {
      timer = setTimeout(() => setResendCountdown(resendCountdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCountdown]);

  const sendOtp = () => {
    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
    //setGeneratedOtp(newOtp);
    setResendCountdown(RESEND_COOLDOWN);
    
    toast({
      title: "OTP Sent!",
        description: `Demo OTP: ${newOtp} (In production, this would be sent to your email)`,
    });
  };

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrors({});

        console.log("Send OTP clicked", formData);
        console.log("API BASE URL:", API_BASE_URL);

        const result = formSchema.safeParse(formData);
        if (!result.success) {
            const fieldErrors: { name?: string; email?: string; phone?: string } = {};
            result.error.errors.forEach((err) => {
                if (err.path[0] === "name") fieldErrors.name = err.message;
                if (err.path[0] === "email") fieldErrors.email = err.message;
                if (err.path[0] === "phone") fieldErrors.phone = err.message;
            });
            setErrors(fieldErrors);
            return;
        }

        try {
            const res = await fetch(`${API_BASE_URL}/api/home/send-otp`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                // 🔥 MUST be a raw JSON string
                body: JSON.stringify(formData.email),
            });

            if (!res.ok) {
                const err = await res.text();
                throw new Error(err);
            }

            setStep("otp");
            setResendCountdown(30);

            toast({
                title: "OTP Sent",
                description: "Please check your email",
            });
        } catch (err) {
            console.error(err);
            toast({
                title: "Error",
                description: "Failed to send OTP",
                variant: "destructive",
            });
        }
    };

    const handleResendOtp = async () => {
        if (resendCountdown > 0) return;

        try {
            await fetch(`${API_BASE_URL}/api/home/send-otp`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData.email),
            });

            setOtp("");
            setResendCountdown(30);

            toast({
                title: "OTP Resent",
                description: "Check your email",
            });
        } catch {
            toast({
                title: "Error",
                description: "Failed to resend OTP",
                variant: "destructive",
            });
        }
    };
    const handleOtpSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrors({});

        try {
            const res = await fetch(`${API_BASE_URL}/api/home/verify-otp`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: formData.email,
                    otp: otp,
                    name: formData.name,
                    phone: formData.phone,
                }),
            });

            if (!res.ok) {
                const errorText = await res.text();
                setErrors({ otp: errorText || "Invalid or expired OTP" });
                return;
            }

            // ✅ OTP verified, start download
            const link = document.createElement("a");
            link.href = "/samplePDF.pdf";
            link.download = "M-Rails-Brochure.pdf";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            toast({
                title: "Success",
                description: "OTP verified. Download started.",
            });

            handleClose();
        } catch (err) {
            setErrors({ otp: "Failed to verify OTP. Try again." });
        }
    };

  const handleClose = () => {
      onOpenChange(false);
    setStep("form");
      setFormData({ name: "", email: "", phone: "" });
    setOtp("");
    //setGeneratedOtp("");
    setErrors({});
    setResendCountdown(0);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) handleClose();
      else onOpenChange(true);
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {step === "form" ? "Download Brochure" : "Verify Your Email"}
          </DialogTitle>
        </DialogHeader>

        {step === "form" ? (
          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                placeholder="Enter your name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
              {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
              {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
            </div>
            <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                    id="phone"
                    type="tel"
                    placeholder="Enter your phone number"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
                {errors.phone && <p className="text-sm text-destructive">{errors.phone}</p>}
            </div>
            <Button type="submit" className="w-full">
              Send OTP
            </Button>
          </form>
        ) : (
          <form onSubmit={handleOtpSubmit} className="space-y-4">
            <p className="text-sm text-muted-foreground">
                We've sent a 6-digit OTP to <strong>{formData.email}</strong>
            </p>
            <div className="space-y-2">
              <Label htmlFor="otp">Enter OTP</Label>
              <Input
                id="otp"
                placeholder="Enter 6-digit OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                maxLength={6}
              />
              {errors.otp && <p className="text-sm text-destructive">{errors.otp}</p>}
            </div>
            <div className="flex items-center justify-between">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleResendOtp}
                disabled={resendCountdown > 0}
                className="text-sm"
              >
                {resendCountdown > 0 ? `Resend OTP in ${resendCountdown}s` : "Resend OTP"}
              </Button>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setStep("form")} className="flex-1">
                Back
              </Button>
              <Button type="submit" className="flex-1">
                Verify & Download
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default BrochureDownloadDialog;
