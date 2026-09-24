import { Card, CardActionArea, CardContent, Typography, Stack, Box, Chip, Radio } from "@mui/material";
import LinkIcon from "@mui/icons-material/LinkOutlined";

// Traits worth comparing against the application's household / existing
// pets text. Only "Yes"/"No" get a colour - "Sometimes"/"Unknown" stay
// neutral so they don't read as a definite answer.
const TRAITS = [
  { key: "childFriendly", label: "Children" },
  { key: "catFriendly", label: "Cats" },
  { key: "dogFriendly", label: "Dogs" },
  { key: "indoorOnly", label: "Indoor only" },
];

function traitColor(value) {
  if (value === "Yes") {
    return "success";
  }

  if (value === "No") {
    return "error";
  }

  return "default";
}

function CatSummary({ cat }) {
  return (
    <Box>
      <Typography sx={{ fontWeight: 600 }}>
        {cat.name}{" "}
        <Typography component="span" variant="body2" color="text.secondary">
          {[cat.gender, cat.age !== "N/A" ? `${cat.age}y` : null, cat.breed !== "N/A" ? cat.breed : null]
            .filter(Boolean)
            .join(" • ")}
        </Typography>
      </Typography>

      <Stack direction="row" spacing={0.5} useFlexGap sx={{ flexWrap: "wrap", mt: 0.5 }}>
        <Chip size="small" variant="outlined" label={`Energy: ${cat.energyLevel}`} />

        {TRAITS.map((trait) => (
          <Chip
            key={trait.key}
            size="small"
            variant="outlined"
            color={traitColor(cat[trait.key])}
            label={`${trait.label}: ${cat[trait.key]}`}
          />
        ))}

        {cat.medicationRequired && <Chip size="small" color="warning" label="Needs medication" />}
      </Stack>

      {cat.personalitySummary && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {cat.personalitySummary}
        </Typography>
      )}
    </Box>
  );
}

// One selectable bonded group (or single cat). Selecting it selects every
// cat in it - there is deliberately no per-cat checkbox.
function BondedGroupOption({ group, selected, onSelect }) {
  const bonded = group.cats.length > 1;

  return (
    <Card
      variant="outlined"
      sx={{
        // text.primary rather than primary.main - the latter matches the
        // dark-mode card background and the border disappears.
        borderColor: selected ? "text.primary" : undefined,
        borderWidth: selected ? 2 : 1,
      }}
    >
      <CardActionArea onClick={onSelect}>
        <CardContent sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
          <Radio checked={selected} size="small" sx={{ mt: -0.75, ml: -1 }} tabIndex={-1} />

          <Stack spacing={1.5} sx={{ flex: 1, minWidth: 0 }}>
            {bonded && (
              <Chip
                icon={<LinkIcon />}
                size="small"
                color="secondary"
                label={`Bonded group of ${group.cats.length} - matched together`}
                sx={{ alignSelf: "flex-start" }}
              />
            )}

            {group.cats.map((cat) => (
              <CatSummary key={cat.id} cat={cat} />
            ))}
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

export default BondedGroupOption;
