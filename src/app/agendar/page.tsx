import { OnlineBooking } from "@/components/online-booking";
import { getProfessionals } from "@/lib/actions/professionals";
import { getServices } from "@/lib/actions/services";

export default async function AgendarPage() {
  const professionals = await getProfessionals();
  const services = await getServices();
  return (
    <div className="min-h-screen bg-[#F0F4F8] sm:py-8">
      <OnlineBooking professionals={professionals} services={services} />
    </div>
  );
}
