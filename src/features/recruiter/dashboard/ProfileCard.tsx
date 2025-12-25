type ProfileCardProps = {
  name: string;
  email: string;
  role: string;
};

export function ProfileCard({ name, email, role }: ProfileCardProps) {
  return (
    <div className="rounded border border-gray-200 p-4">
      <p className="font-medium">{name}</p>
      <p className="text-sm text-gray-600">{email}</p>
      <p className="mt-1 text-xs uppercase tracking-wide text-gray-500">
        Role: {role}
      </p>
    </div>
  );
}
