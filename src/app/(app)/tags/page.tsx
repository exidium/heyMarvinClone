import { PageHeader } from "@/components/shell/PageHeader";
import { TagsManager } from "@/components/tags/TagsManager";
import { requirePageUser } from "@/lib/auth";
import { listTagsAdmin } from "@/server/queries/tags";

export const metadata = { title: "Tags" };

export default async function TagsPage() {
  const user = await requirePageUser();
  const { groups, tags } = await listTagsAdmin();
  return (
    <>
      <PageHeader
        title="Tags"
        description={user.isAdmin ? "Global tag list: groups, rename, merge, archive. Editors can also create tags while highlighting." : "Global tag list. Only admins can change it; you can create tags while highlighting."}
      />
      <div className="p-6">
        <TagsManager groups={groups} tags={tags} canManage={user.isAdmin} />
      </div>
    </>
  );
}
