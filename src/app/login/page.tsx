import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted">
      <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md flex flex-col gap-6">
        <div className="flex flex-col items-center gap-2">
          <div className="text-3xl font-bold">Create an account</div>
          <div className="text-sm text-muted-foreground">
            Already have an account? <a href="#" className="underline">Log in</a>
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <Button variant="outline" className="w-full flex gap-2 items-center">
            Continue With Google
          </Button>
          <Button variant="outline" className="w-full flex gap-2 items-center">
            Continue With GitHub
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-px bg-muted-foreground/20" />
          <span className="text-xs text-muted-foreground">or, sign up with your email</span>
          <div className="flex-1 h-px bg-muted-foreground/20" />
        </div>
        <form className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <Label htmlFor="email">Work email</Label>
            <Input id="email" type="email" placeholder="stephanie@mycompany.com" required />
          </div>
          <Button type="submit" className="w-full">Get Started</Button>
        </form>
      </div>
    </div>
  );
} 